import type { Plugin, JssStyle, Rule, StyleSheet } from 'jss';
declare type Optional<T> = T | null | undefined;
declare type ExtendableObject = JssStyle | string;
declare type SingleExtend = Optional<ExtendableObject>;
declare type Extend = SingleExtend | SingleExtend[];
declare type Style = JssStyle & {
    extend?: Optional<Extend>;
};
export type { Style, Style as ExtendableStyle, Style as JssStyle };
export declare const mergeStyle: (style: Style, newStyle: Style, rule?: Rule | undefined, sheet?: StyleSheet<string | number | symbol> | undefined) => void;
export default function pluginExtend(): Plugin;
