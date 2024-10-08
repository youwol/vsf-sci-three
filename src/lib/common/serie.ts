import { createTyped } from './utils'

/** Interface for supported array in {@link Serie}:
 * -    Array
 * -    TypedArray with either shared or not buffer
 */
export interface IArray {
    readonly length: number
    [i: number]: number
    map(cb): IArray
    forEach(cb): void
    slice(start: number, end: number): IArray
    fill(n: number): IArray
    reduce<U>(
        callback: (
            previousValue: number,
            currentValue: number,
            currentIndex: number,
            array: IArray,
        ) => number,
        firstState?: U,
    ): U
    filter(cb): IArray
    sort(fn): IArray
}

/**
 * T is either an Array, or a TypedArray (Float32Array etc...) supported by an
 * ArrayBuffer or SharedArrayBuffer
 * @category Base
 */
export class Serie<T extends IArray = IArray> {
    /**
     * The underlying array of the serie
     */
    public readonly array: T

    /**
     * The itemSize is the dimension of one 'cell' of the serie
     */
    public readonly itemSize: number

    /**
     * The dimension of the space. As an example, for a numerical code
     * computing stresses and/or displacement fields, in 3D the dimension
     * will be 3 and in 2D the dimension will be 2. It is the user
     * responsability to properly set this value.
     */
    public readonly dimension: number = 3

    /**
     * Whether or not {@link array} is a SharedArrayBuffer
     */
    public readonly shared: boolean

    /**
     *
     * Mutable dictionary to store consumer data (context information of the usage)
     */
    public userData: { [key: string]: unknown } = {}

    private constructor(
        array: T,
        itemSize: number,
        shared: boolean,
        userData: { [key: string]: unknown } = {},
        dimension = 3,
    ) {
        if (array.length % itemSize !== 0) {
            throw new Error(
                `array length (${array.length}) is not a multiple of itemSize (${itemSize})`,
            )
        }
        this.array = array
        this.itemSize = itemSize
        this.shared = shared
        this.userData = userData
        this.dimension = dimension // ! use dimension
    }

    static isSerie(s: unknown): s is Serie {
        return (
            (s as Serie).array !== undefined &&
            (s as Serie).itemSize !== undefined
        )
    }

    static create<T extends IArray = IArray>({
        array,
        itemSize,
        userData,
        dimension = 3, // ! use dimension
    }: {
        array: T
        itemSize: number
        userData?: { [key: string]: unknown }
        dimension?: number
    }) {
        // Type is either a Int8Array, Uint8Array etc...

        if (itemSize <= 0) {
            throw new Error('itemSize must be > 0')
        }
        if (array === undefined) {
            throw new Error('array must be provided')
        }

        // Check that SharedArrayBuffer are supported...
        if (typeof SharedArrayBuffer === 'undefined') {
            return new Serie(array, itemSize, false, userData, dimension) // ! use dimension
        }

        const shared = array['buffer'] instanceof SharedArrayBuffer
        return new Serie(array, itemSize, shared, userData, dimension) // ! use dimension
    }
    /**
     * Get the size of this serie, i.e., being {@link count} * {@link itemSize}
     */
    get length() {
        return this.array.length
    }

    /**
     * Get the number of items (an item being of size {@link itemCount})
     */
    get count() {
        return this.array.length / this.itemSize
    }

    /**
     * True if this serie is an Array<number
     */
    get isArray() {
        return Array.isArray(this.array)
    }

    /**
     * True if this serie is a TypedArray
     * @see isTypedArray
     */
    get isArrayBuffer() {
        return this.isTypedArray
    }

    /**
     * True if this serie is a TypedArray
     * @see isArrayBuffer
     */
    get isTypedArray() {
        return !this.isArray
    }

    /**
     * True if this serie is the buffer of the TypedArray is
     * a SharedArrayBuffer
     */
    get isShared() {
        if (this.isArray) {
            return false
        }
        return this.array['buffer'] instanceof SharedArrayBuffer
    }

    at(i: number) {
        return this.array[i]
    }

    itemAt(i: number): number | number[] {
        const size = this.itemSize
        if (size === 1) {
            return this.at(i)
        }
        const start = i * size
        const r = new Array(size).fill(0)
        for (let j = 0; j < size; ++j) {
            r[j] = this.array[start + j]
        }
        return r
    }

    setItemAt(i: number, value: number | IArray): void {
        if (i >= this.count) {
            throw new Error('array index out of bounds')
        }

        const size = this.itemSize

        if (size === 1) {
            if (Array.isArray(value)) {
                throw new Error('value must be a number')
            }
            this.array[i] = value as number
            return
        }

        const v = value as number[]
        if (v.length !== size) {
            throw new Error(
                `array length (${v.length}) must equals itemSize (${size})`,
            )
        }
        for (let j = 0; j < size; ++j) {
            this.array[i * size + j] = value[j]
        }
    }

    /**
     * Iterate over all items
     * @param callback The callback that will called for each item
     */
    forEach(callback: (item, index, serie) => void) {
        for (let i = 0; i < this.count; ++i) {
            callback(this.itemAt(i), i, this)
        }
    }

    /**
     * Map the items
     */
    map(callback: (item, index, serie) => number) {
        const tmp = callback(this.itemAt(0), 0, this)

        const itemSize = Array.isArray(tmp) ? tmp.length : 1
        const R = this.image(this.count, itemSize)

        let id = 0
        for (let i = 0; i < this.count; ++i) {
            const r = callback(this.itemAt(i), i, this)
            if (itemSize === 1) {
                R.array[id++] = r
            } else {
                for (let j = 0; j < itemSize; ++j) {
                    R.array[id++] = r[j]
                }
            }
        }
        return R
    }

    // clone(resetValues = false) {
    //     const s = new Serie(
    //         this.array.slice(0, this.count * this.itemSize),
    //         this.itemSize,
    //         this.shared,
    //         this.userData,
    //         this.dimension,
    //     ) // ! use dimension
    //     if (resetValues) {
    //         s.array.forEach((_, i) => (s.array[i] = 0)) // reset
    //     }
    //     return s
    // }

    /**
     * Same as {@link image}. All values are set to 0 (i.e., 0, [0,0], [0,0,0]...)
     * @see clone
     * @see image
     */
    newInstance({
        count,
        itemSize,
        initialize = true,
    }: {
        count: number
        itemSize: number
        initialize?: boolean
    }) {
        const s = new Serie(
            createFrom({ array: this.array, count, itemSize }),
            itemSize,
            this.shared,
            this.userData,
            this.dimension,
        ) // ! use dimension
        if (initialize) {
            for (let i = 0; i < s.array.length; ++i) {
                s.array[i] = 0
            }
        }
        return s
    }

    /**
     * Return a new serie similar to this (same type of array and buffer), but with
     * different count and itemSize. All values are initialized to 0. We keep this
     * mathod for compatibility reason.
     * @param count    The number of items
     * @param itemSize The size of the items
     * @see clone
     * @see newInstance
     */
    image(count: number, itemSize: number) {
        return this.newInstance({ count, itemSize })
    }
}

// --------------------------------------------------

/**
 * @category Creation
 */
export function createFrom<T extends IArray>({
    array,
    count,
    itemSize,
}: {
    array: T
    count: number
    itemSize: number
}): IArray {
    const length = count * itemSize

    if (Array.isArray(array)) {
        return new Array(length) as IArray
    }

    let isShared = false
    if (typeof SharedArrayBuffer !== 'undefined') {
        isShared = array['buffer'] instanceof SharedArrayBuffer
    }

    if (array instanceof Int8Array) {
        return createTyped(Int8Array, length, isShared)
    }
    if (array instanceof Uint8Array) {
        return createTyped(Uint8Array, length, isShared)
    }
    if (array instanceof Uint8ClampedArray) {
        return createTyped(Uint8ClampedArray, length, isShared)
    }
    if (array instanceof Int16Array) {
        return createTyped(Int16Array, length, isShared)
    }
    if (array instanceof Uint16Array) {
        return createTyped(Uint16Array, length, isShared)
    }
    if (array instanceof Int32Array) {
        return createTyped(Int32Array, length, isShared)
    }
    if (array instanceof Uint32Array) {
        return createTyped(Uint32Array, length, isShared)
    }
    if (array instanceof Float32Array) {
        return createTyped(Float32Array, length, isShared)
    }
    if (array instanceof Float64Array) {
        return createTyped(Float64Array, length, isShared)
    }
    if (array instanceof BigInt64Array) {
        return createTyped(BigInt64Array, length, isShared)
    }
    if (array instanceof BigUint64Array) {
        return createTyped(BigUint64Array, length, isShared)
    }
}
