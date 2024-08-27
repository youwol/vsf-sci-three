type AllTags = keyof HTMLElementTagNameMap
export type Configuration = {
    TypeCheck: 'strict'
    SupportedHTMLTags: 'Dev' extends 'Prod' ? AllTags : DevTags
    WithFluxView: false
}

type DevTags =
    | 'div'
    | 'pre'
    | 'select'
    | 'i'
    | 'h1'
    | 'option'
    | 'h2'
    | 'h3'
    | 'ul'
    | 'li'
    | 'iframe'
