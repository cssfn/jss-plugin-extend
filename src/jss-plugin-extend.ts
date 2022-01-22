// jss:
import type {
    Plugin,
    JssStyle,

    Rule,
    StyleSheet,
}                           from 'jss'           // base technology of our cssfn components

// cssfn:
import type {
    ValueOf,
}                           from '@cssfn/types'       // cssfn's types

// others libs:
import warning              from 'tiny-warning'



// utilities:
type LiteralObject      = { [key: string]: any }
const isLiteralObject   = (object: any): object is LiteralObject => object && (typeof(object) === 'object') && !Array.isArray(object);

// upgrade `JssStyle` definition:
type Optional<T>        = T|null|undefined
type ExtendableObject   = JssStyle|string // extend using a JssStyle object or using a rule name
type SingleExtend       = Optional<ExtendableObject>
type Extend             = SingleExtend|SingleExtend[]
type Style              = JssStyle & { extend?: Optional<Extend> } // add `extend` prop into `JssStyle`
// export the upgraded `JssStyle`:
export type { Style, Style as ExtendableStyle, Style as JssStyle }
const isStyle           = (object: any): object is Style => isLiteralObject(object);



const mergeExtend       = (style: Style, rule?: Rule, sheet?: StyleSheet): void => {
    const extend = style.extend;
    if (!extend) return; // nothing to extend


    
    // if `extend` is an `Array` => loop it
    // otherwise => convert to single `Array` => loop it
    for (const singleExtend of (Array.isArray(extend) ? extend : [extend])) {
        if (!singleExtend) continue; // null & undefined => skip
        
        
        
        //#region extend using a `Style`
        if (isStyle(singleExtend)) {
            mergeStyle(style, singleExtend, rule, sheet);
        } // if
        //#endregion extend using a `Style`
        
        
        
        //#region extend using a rule name
        else if (typeof(singleExtend) === 'string') {
            if (sheet) {
                const refRule = sheet.getRule(singleExtend) as Optional<Rule>;
                if (refRule) {
                    if (refRule === rule) {
                        warning(false, `[JSS] A rule tries to extend itself \n${rule.toString()}`);
                        
                        // TODO: detect circular ref, causing infinite recursive
                    }
                    else {
                        // now it seems the `refRule` is not `rule` nor circular ref
                        // warning: calling `mergeStyle` might causing infinite recursive if the `refRule` is `rule` or circular ref
                        
                        const ruleStyle = (refRule.options?.parent as any)?.rules?.raw?.[singleExtend] as Optional<Style>;
                        if (ruleStyle) {
                            mergeStyle(style, ruleStyle, rule, sheet);
                        } // if
                    } // if
                } // if
            } // if
        } // if
        //#endregion extend using a rule name
    } // for



    // the `extend` operation has been completed => remove unused `extend` prop:
    delete style.extend; // delete `extend` prop, so another plugins won't see this
}
const mergeLiteral      = (style: Style & LiteralObject, newStyle: Style, rule?: Rule, sheet?: StyleSheet): void => {
    for (const [propName, newPropValue] of [
        ...Object.entries(newStyle),
        ...Object.getOwnPropertySymbols(newStyle).map((sym): [symbol, ValueOf<typeof newStyle>] => [sym, (newStyle as any)[sym] as any]),
    ]) { // loop through `newStyle`'s props
        // `extend` is a special prop name that we don't handle here:
        if (propName === 'extend') continue; // skip `extend` prop
        
        
        
        if (!isStyle(newPropValue)) {
            // `newPropValue` is not a `Style` => unmergeable => add/overwrite `newPropValue` into `style`:
            delete style[propName as string]; // delete the old prop (if any), so the new prop always placed at the end of LiteralObject
            style[propName as string] = newPropValue; // add/overwrite
        }
        else {
            // `newPropValue` is a `Style` => possibility to merge with `currentPropValue`

            const currentPropValue = style[propName as string];
            if (!isStyle(currentPropValue)) {
                // `currentPropValue` is not a `Style` => unmergeable => add/overwrite `newPropValue` into `style`:
                delete style[propName as string]; // delete the old prop (if any), so the new prop always placed at the end of LiteralObject
                style[propName as string] = newPropValue; // add/overwrite
            }
            else {
                // both `newPropValue` & `currentPropValue` are `Style` => merge them recursively (deeply):

                const currentValueClone = {...currentPropValue} as Style; // clone the `currentPropValue` to avoid side effect, because the `currentPropValue` is not **the primary object** we're working on
                mergeStyle(currentValueClone, newPropValue, rule, sheet);
                
                // merging style prop no need to rearrange the prop position
                style[propName as string] = currentValueClone; // set the mutated `currentValueClone` back to `style`
            } // if
        } // if
    } // for
}
// we export `mergeStyle` so it reusable:
export const mergeStyle = (style: Style, newStyle: Style, rule?: Rule, sheet?: StyleSheet): void => {
    const newStyleClone = {...newStyle} as Style; // clone the `newStyle` to avoid side effect, because the `newStyle` is not **the primary object** we're working on
    mergeExtend(newStyleClone, rule, sheet);

    mergeLiteral(style, newStyleClone, rule, sheet);
}



const onProcessStyle = (style: Style|null, rule: Rule, sheet?: StyleSheet): Style => {
    if (!style) return {};
    
    
    
    mergeExtend(style, rule, sheet);



    return style;
};

const unextendedProp = Symbol();
const onChangeValue  = (value: any, prop: string, rule: Rule): string|null|false => {
    if (prop !== 'extend') return value; // do not modify any props other than `extend`



    if (typeof(value) === 'object') {
        const defineProp = (rule as any).prop;
        if (typeof(defineProp) === 'function') {
            for (const [propName, propValue] of Object.entries(value)) { // no need to iterate Symbol(s), because [prop: Symbol] is for storing nested rule
                defineProp(propName, propValue);
            } // for


            
            // store the object to the rule, so we can remove all props we've set later:
            (rule as any)[unextendedProp] = value;
        } // if
    }
    else if ((value === null) || (value === false)) {
        // remove all props we've set before (if any):
        const prevObject = (rule as any)[unextendedProp];
        if (prevObject) {
            const defineProp = (rule as any).prop;
            if (typeof(defineProp) === 'function') {
                for (const propName of Object.keys(prevObject)) { // no need to iterate Symbol(s), because [prop: Symbol] is for storing nested rule
                    defineProp(propName, null);
                } // for
            } // if



            // clear the stored object:
            delete (rule as any)[unextendedProp];
        } // if
    } // if

    
    
    return null; // do not set the value in the core
};

export default function pluginExtend(): Plugin { return {
    onProcessStyle,
    onChangeValue,
}}
