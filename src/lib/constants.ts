import { setup } from '../auto-generated'

export const basePathDoc = `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/dist/docs/modules`

export const urlModuleDoc = (module) => `${basePathDoc}/${module}.html`
