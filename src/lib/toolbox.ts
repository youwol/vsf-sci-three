import { basePathDoc } from './constants'
import { setup } from '../auto-generated'

export function toolbox() {
    return {
        name: 'files',
        uid: setup.name,
        origin: {
            packageName: setup.name,
            version: setup.version,
        },
        documentation: `${basePathDoc}.html`,
        icon: {
            svgString: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
<!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->
<path fill="black" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
</svg>`,
        },
        modules: [],
    }
}