import { IArray, Serie } from '../common/serie'
import { append, DataFrame } from '../common/dataframe'

/**
 * Create a Gocad Surface (DataFrame) from a string buffer
 * @category Decoder
 */
export function decodeGocadTS(
    buffer: string,
    {
        shared = true,
        //merge = true,
        repair = false,
    }: { shared?: boolean; /*merge?: boolean;*/ repair?: boolean } = {},
) {
    return loadGocadObject({
        buffer,
        keyword: 'TRGL',
        separator: 'TFACE',
        dimension: 3,
        className: 'Surface',
        extension: 'ts',
        shared,
        //merge,
        repair,
    })
}

export function trimAll(s: string) {
    return s
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/, '')
        .replace('\t', ' ')
        .trimEnd()
}

function loadGocadObject({
    buffer,
    keyword,
    separator,
    dimension,
    className,
    extension,
    shared,
    //merge,
    repair,
}: {
    buffer: string
    keyword: string
    separator: string
    dimension: number
    className: string
    extension: string
    shared: boolean
    //merge: boolean
    repair: boolean
}) {
    const lines = buffer.split('\n')
    let name = 'no-name'

    let attributes: number[][] = []
    let attrNames: string[] = []
    let attrSizes: number[] = []
    let nbFlatAttributes = -1

    let startIndex = 0
    let nbVertices = 0
    let positions = []
    let indices = []

    const objects: any[] = []

    const haveIndices = keyword !== ''
    const SEP = separator

    for (let i = 0; i < lines.length; ++i) {
        const line = trimAll(lines[i])
        if (line.length === 0 || line.charAt(0) === '#') {
            continue
        }
        if (
            line.length >= 2 &&
            line.charAt(0) === '/' &&
            line.charAt(1) === '/'
        ) {
            continue
        }

        const r = line
            .split(' ')
            .map((s: string) => s.trim())
            .filter((s: string) => s !== '')
        if (r.length === 0) {
            continue
        }

        const names = line.split(':')
        if (names.length === 0) {
            continue
        }

        if (names[0] === 'name' && names.length > 1) {
            name = trimAll(names[1])
            continue
        }

        if (r[0] === SEP) {
            // new object
            const object = createObject({
                positions,
                indices,
                attrNames,
                attrSizes,
                attributes,
                itemSize: dimension,
                shared,
                name,
                className,
                extension,
                //merge,
            })
            if (object) {
                objects.push(object)
            }

            // Use the same attributes
            attributes = attributes.map((_) => [])
            positions = []
            indices = []
            startIndex = nbVertices // DO NOT reset the increment of the indices for components
            continue
        }

        if (r[0] === 'GOCAD') {
            const object = createObject({
                positions,
                indices,
                attrNames,
                attrSizes,
                attributes,
                itemSize: dimension,
                shared,
                name,
                className,
                extension,
                //merge,
            })
            if (object) {
                objects.push(object)
            }

            name = 'no-name'
            attributes = []
            attrNames = []
            nbFlatAttributes = -1
            positions = []
            indices = []
            startIndex = 0
            nbVertices = 0
            continue
        }

        if (r[0] === 'PROPERTIES') {
            attributes = []
            attrNames = []
            nbFlatAttributes = -1
            for (let j = 1; j < r.length; ++j) {
                //attributes.push([])
                attrNames.push(r[j])
            }
            continue
        }

        if (r[0] === 'ESIZES') {
            attrSizes = []
            for (let j = 1; j < r.length; ++j) {
                attrSizes.push(parseInt(r[j]))
            }
            if (attrSizes.length !== attrNames.length) {
                throw new Error(
                    `size mismatch between PROPERTIES (${attrNames.length}) and ESIZES (${attrSizes.length})`,
                )
            }
            continue
        }

        if (r[0] === 'VRTX' || r[0] === 'PVRTX') {
            ++nbVertices

            positions.push(parseFloat(r[2]), parseFloat(r[3]), parseFloat(r[4]))

            // Initialize attributes and nbFlatAtributes
            if (nbFlatAttributes === -1) {
                startIndex = parseInt(r[1]) // CHECK !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                if (attrSizes.length === 0) {
                    for (let i = 0; i < attrNames.length; ++i) {
                        attrSizes[i] = 1
                    }
                }

                nbFlatAttributes = attrSizes.reduce((acc, v) => acc + v, 0)
                attributes = new Array(nbFlatAttributes)
                    .fill(undefined)
                    .map((_) => [])
            }

            if (nbFlatAttributes !== r.length - 5) {
                throw new Error(
                    `Wrong number of attributes for vertex. Should be ${nbFlatAttributes} and got ${
                        r.length - 5
                    }.\n Line: ${line}`,
                )
            }

            for (let j = 0; j < nbFlatAttributes; ++j) {
                attributes[j].push(parseFloat(r[5 + j]))
            }
            continue
        }

        if (haveIndices && r[0] === keyword) {
            if (repair === false) {
                for (let i = 0; i < dimension; ++i) {
                    const j = parseInt(r[1 + i], 10) - startIndex
                    indices.push(j)
                }
            } else if (dimension === 3) {
                const idx = []
                for (let i = 0; i < dimension; ++i) {
                    const j = parseInt(r[1 + i], 10) - startIndex
                    idx.push(j)
                }
                /*const v1 = [
                    positions[3 * idx[0]],
                    positions[3 * idx[0] + 1],
                    positions[3 * idx[0] + 2],
                ]
                const v2 = [
                    positions[3 * idx[1]],
                    positions[3 * idx[1] + 1],
                    positions[3 * idx[1] + 2],
                ]
                const v3 = [
                    positions[3 * idx[2]],
                    positions[3 * idx[2] + 1],
                    positions[3 * idx[2] + 2],
                ]
                const V = vec.cross(
                    vec.create(v1, v2) as vec.Vector3,
                    vec.create(v1, v3) as vec.Vector3,
                )
                const area = vec.norm(V)
                if (area > 1e-12) {
                    indices.push(...idx)
                } else {
                    // Skip this triangle as it is degenerated
                }*/
            }
        }
    }

    // Finish the last object if any
    const object = createObject({
        positions,
        indices,
        attrNames,
        attrSizes,
        attributes,
        itemSize: dimension,
        shared,
        name,
        className,
        extension,
        //merge,
    })
    if (object) {
        objects.push(object)
    }

    return objects
}

// ----------------------------------------------------

const arrayMax = (a: IArray) =>
    a.reduce((acc, cur) => (cur > acc ? cur : acc), 0)

export function createTyped<T>(
    Type: any,
    array: number | number[],
    shared: boolean,
): T {
    if (Array.isArray(array)) {
        const length = array.length * Type.BYTES_PER_ELEMENT
        let ta = undefined

        const isSharedAvailable = typeof SharedArrayBuffer !== 'undefined'

        if (shared && isSharedAvailable) {
            ta = new Type(new SharedArrayBuffer(length))
        } else {
            ta = new Type(new ArrayBuffer(length))
        }
        ta.set(array)
        return ta
    } else {
        const l = array * Type.BYTES_PER_ELEMENT
        if (shared) {
            return new Type(new SharedArrayBuffer(l))
        }
        return new Type(new ArrayBuffer(l))
    }
}

function createObject({
    positions,
    indices,
    attrNames,
    attrSizes,
    attributes,
    itemSize,
    shared,
    name,
    className,
    extension,
}: //merge,
{
    positions: number[]
    indices: number[]
    attrNames: string[]
    attrSizes: number[]
    attributes: number[][]
    itemSize: number
    name: string
    className: string
    shared: boolean
    extension: string
    //merge: boolean
}) {
    if (positions.length === 0) {
        return undefined
    }

    const userData = {
        className,
        extension,
        name,
        attributeNames: attrNames,
    }
    const posSerie = Serie.create({
        array: createTyped<Float32Array>(Float32Array, positions, shared),
        itemSize: 3,
    })

    let df =
        indices !== undefined && indices.length !== 0
            ? DataFrame.create({
                  series: {
                      positions: posSerie,
                      indices:
                          arrayMax(indices) > 65535
                              ? Serie.create({
                                    array: createTyped<Uint32Array>(
                                        Uint32Array,
                                        indices,
                                        shared,
                                    ),
                                    itemSize,
                                })
                              : Serie.create({
                                    array: createTyped<Uint16Array>(
                                        Uint16Array,
                                        indices,
                                        shared,
                                    ),
                                    itemSize,
                                }),
                  },
                  userData,
              })
            : DataFrame.create({
                  series: {
                      positions: posSerie,
                  },
                  userData,
              })

    // can merge only if all attribute are of size 1
    // const canMerge = attrSizes.reduce((acc, size) => acc && size === 1, true)

    //if (merge && canMerge && false)
    const entries = new Map()
    let i = 0
    attrSizes.forEach((size, k) => {
        const attrs = []
        for (let j = i; j < i + size; ++j) {
            attrs.push(attributes[j])
        }
        const attr = concatenate(attrs)
        entries.set(
            attrNames[k],
            Serie.create({
                array: createTyped<Float32Array>(Float32Array, attr, shared),
                itemSize: size,
            }),
        )
        i += size
    })

    // attrNames.forEach( (name, i) => {
    //     entries.set(name, createSerie({
    //         data: createTyped(Float32Array, attributes[i], shared),
    //         itemSize: attrSizes[i]
    //     }))
    // })
    df = append(df, Object.fromEntries(entries))

    return df
}

export const concatenate = (mat: number[][]) => {
    const itemSize = mat.length
    const n = mat[0].length
    const a = new Array(n * itemSize).fill(0)
    let k = 0
    for (let j = 0; j < n; ++j) {
        for (let i = 0; i < itemSize; ++i) {
            a[k++] = mat[i][j]
        }
    }
    return a
}
