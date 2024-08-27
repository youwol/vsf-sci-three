
const runTimeDependencies = {
    "externals": {
        "@youwol/vsf-core": "^0.3.1",
        "rxjs": "^7.5.6",
        "three": "^0.152.0"
    },
    "includedInBundle": {}
}
const externals = {
    "@youwol/vsf-core": {
        "commonjs": "@youwol/vsf-core",
        "commonjs2": "@youwol/vsf-core",
        "root": "@youwol/vsf-core_APIv03"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv7"
    },
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv7",
            "operators"
        ]
    },
    "three": {
        "commonjs": "three",
        "commonjs2": "three",
        "root": "three_APIv0152"
    }
}
const exportedSymbols = {
    "@youwol/vsf-core": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/vsf-core"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    },
    "three": {
        "apiKey": "0152",
        "exportedSymbol": "three"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "@youwol/vsf-core"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {
    "gocad": {
        "entryFile": "./lib/gocad/index.ts",
        "loadDependencies": [
            "@youwol/vsf-core",
            "rxjs",
            "three"
        ],
        "name": "gocad"
    }
}

const entries = {
     '@youwol/vsf-sci-three': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/vsf-sci-three/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/vsf-sci-three',
        assetId:'QHlvdXdvbC92c2Ytc2NpLXRocmVl',
    version:'0.1.2',
    shortDescription:"Visual Studio Flow toolbox gathering modules related to 3D scientific visualizations.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/vsf-sci-three&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/vsf-sci-three',
    sourceGithub:'https://github.com/youwol/vsf-sci-three',
    userGuide:'https://l.youwol.com/doc/@youwol/vsf-sci-three',
    apiVersion:'01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/vsf-sci-three_APIv01`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/vsf-sci-three#0.1.2~dist/@youwol/vsf-sci-three/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/vsf-sci-three/${entry.name}_APIv01`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
