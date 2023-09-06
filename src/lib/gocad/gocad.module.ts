import { Contracts, Modules, Configurations } from '@youwol/vsf-core'
import { map } from 'rxjs/operators'
import { decodeGocadTS } from './loaders'
import { BufferGeometry, BufferAttribute, Vector3 } from 'three'
export const configuration = {
    schema: {
        center: new Configurations.Boolean({ value: false }),
    },
}

export const inputs = {
    input$: {
        description: 'A input mapping to a valid GOCAD object definition',
        contract: Contracts.of<string>({
            description: 'A valid GOCAD object as string',
            when: (d) => typeof d === 'string',
        }),
    },
}

export const outputs = (
    arg: Modules.OutputMapperArg<typeof configuration.schema, typeof inputs>,
) => ({
    output$: arg.inputs.input$.pipe(
        map(({ data, configuration, context }) => {
            const overallBarycenter = new Vector3()

            const geometries = decodeGocadTS(data).map((decoded) => {
                const geometry = new BufferGeometry()
                const positionsAttribute = new BufferAttribute(
                    decoded.series.positions.array,
                    3,
                )
                geometry.setAttribute('position', positionsAttribute)
                const indicesAttribute = new BufferAttribute(
                    decoded.series.indices.array,
                    1,
                )
                geometry.setIndex(indicesAttribute)

                geometry.computeVertexNormals()
                geometry.computeBoundingBox()
                geometry.computeBoundingSphere()

                const barycenter = new Vector3()
                geometry.boundingBox.getCenter(barycenter)
                overallBarycenter.add(barycenter)

                return geometry
            })
            if (configuration.center) {
                overallBarycenter.divideScalar(geometries.length)
                const translationVector = new Vector3()
                    .copy(overallBarycenter)
                    .negate()
                for (const geometry of geometries) {
                    geometry.translate(
                        translationVector.x,
                        translationVector.y,
                        translationVector.z,
                    )
                }
            }
            return {
                data: geometries,
                context,
            }
        }),
    ),
})

export function module(fwdParams) {
    return new Modules.Implementation(
        {
            configuration,
            inputs,
            outputs,
        },
        fwdParams,
    )
}
