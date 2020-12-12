**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / DeepArray

# Interface: DeepArray<T\>

## Type parameters

Name |
------ |
`T` |

## Hierarchy

* [Array](deeparray.md#array)<T \| [DeepArray](deeparray.md)<T\>\>

  ↳ **DeepArray**

## Indexable

▪ [n: number]: T \| [DeepArray](deeparray.md)<T\>

## Index

### Properties

* [Array](deeparray.md#array)
* [length](deeparray.md#length)

### Methods

* [[Symbol.iterator]](deeparray.md#[symbol.iterator])
* [[Symbol.unscopables]](deeparray.md#[symbol.unscopables])
* [concat](deeparray.md#concat)
* [copyWithin](deeparray.md#copywithin)
* [entries](deeparray.md#entries)
* [every](deeparray.md#every)
* [fill](deeparray.md#fill)
* [filter](deeparray.md#filter)
* [find](deeparray.md#find)
* [findIndex](deeparray.md#findindex)
* [forEach](deeparray.md#foreach)
* [includes](deeparray.md#includes)
* [indexOf](deeparray.md#indexof)
* [join](deeparray.md#join)
* [keys](deeparray.md#keys)
* [lastIndexOf](deeparray.md#lastindexof)
* [map](deeparray.md#map)
* [pop](deeparray.md#pop)
* [push](deeparray.md#push)
* [reduce](deeparray.md#reduce)
* [reduceRight](deeparray.md#reduceright)
* [reverse](deeparray.md#reverse)
* [shift](deeparray.md#shift)
* [slice](deeparray.md#slice)
* [some](deeparray.md#some)
* [sort](deeparray.md#sort)
* [splice](deeparray.md#splice)
* [toLocaleString](deeparray.md#tolocalestring)
* [toString](deeparray.md#tostring)
* [unshift](deeparray.md#unshift)
* [values](deeparray.md#values)

## Properties

### Array

•  **Array**: ArrayConstructor

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1403*

___

### length

•  **length**: number

*Inherited from [DeepArray](deeparray.md).[length](deeparray.md#length)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1224*

Gets or sets the length of the array. This is a number one higher than the highest element defined in an array.

## Methods

### [Symbol.iterator]

▸ **[Symbol.iterator]**(): IterableIterator<T \| [DeepArray](deeparray.md)<T\>\>

*Inherited from [DeepArray](deeparray.md).[[Symbol.iterator]](deeparray.md#[symbol.iterator])*

*Defined in node_modules/typescript/lib/lib.es2015.iterable.d.ts:60*

Iterator

**Returns:** IterableIterator<T \| [DeepArray](deeparray.md)<T\>\>

___

### [Symbol.unscopables]

▸ **[Symbol.unscopables]**(): object

*Inherited from [DeepArray](deeparray.md).[[Symbol.unscopables]](deeparray.md#[symbol.unscopables])*

*Defined in node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:94*

Returns an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

**Returns:** object

Name | Type |
------ | ------ |
`copyWithin` | boolean |
`entries` | boolean |
`fill` | boolean |
`find` | boolean |
`findIndex` | boolean |
`keys` | boolean |
`values` | boolean |

___

### concat

▸ **concat**(...`items`: ConcatArray<T \| [DeepArray](deeparray.md)<T\>\>[]): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[concat](deeparray.md#concat)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1246*

Combines two or more arrays.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`...items` | ConcatArray<T \| [DeepArray](deeparray.md)<T\>\>[] | Additional items to add to the end of array1.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

▸ **concat**(...`items`: (T \| [DeepArray](deeparray.md)<T\> \| ConcatArray<T \| [DeepArray](deeparray.md)<T\>\>)[]): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[concat](deeparray.md#concat)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1251*

Combines two or more arrays.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`...items` | (T \| [DeepArray](deeparray.md)<T\> \| ConcatArray<T \| [DeepArray](deeparray.md)<T\>\>)[] | Additional items to add to the end of array1.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

___

### copyWithin

▸ **copyWithin**(`target`: number, `start`: number, `end?`: number): this

*Inherited from [DeepArray](deeparray.md).[copyWithin](deeparray.md#copywithin)*

*Defined in node_modules/typescript/lib/lib.es2015.core.d.ts:64*

Returns the this object after copying a section of the array identified by start and end
to the same array starting at position target

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`target` | number | If target is negative, it is treated as length+target where length is the length of the array. |
`start` | number | If start is negative, it is treated as length+start. If end is negative, it is treated as length+end. |
`end?` | number | If not specified, length of the this object is used as its default value.  |

**Returns:** this

___

### entries

▸ **entries**(): IterableIterator<[number, T \| [DeepArray](deeparray.md)<T\>]\>

*Inherited from [DeepArray](deeparray.md).[entries](deeparray.md#entries)*

*Defined in node_modules/typescript/lib/lib.es2015.iterable.d.ts:65*

Returns an iterable of key, value pairs for every entry in the array

**Returns:** IterableIterator<[number, T \| [DeepArray](deeparray.md)<T\>]\>

___

### every

▸ **every**<S\>(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S, `thisArg?`: any): this is S[]

*Inherited from [DeepArray](deeparray.md).[every](deeparray.md#every)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1319*

Determines whether all the members of an array satisfy the specified test.

#### Type parameters:

Name | Type |
------ | ------ |
`S` | T \| [DeepArray](deeparray.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
`thisArg?` | any | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** this is S[]

▸ **every**(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown, `thisArg?`: any): boolean

*Inherited from [DeepArray](deeparray.md).[every](deeparray.md#every)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1328*

Determines whether all the members of an array satisfy the specified test.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
`thisArg?` | any | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** boolean

___

### fill

▸ **fill**(`value`: T \| [DeepArray](deeparray.md)<T\>, `start?`: number, `end?`: number): this

*Inherited from [DeepArray](deeparray.md).[fill](deeparray.md#fill)*

*Defined in node_modules/typescript/lib/lib.es2015.core.d.ts:53*

Returns the this object after filling the section identified by start and end with value

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`value` | T \| [DeepArray](deeparray.md)<T\> | value to fill array section with |
`start?` | number | index to start filling the array at. If start is negative, it is treated as length+start where length is the length of the array. |
`end?` | number | index to stop filling the array at. If end is negative, it is treated as length+end.  |

**Returns:** this

___

### filter

▸ **filter**<S\>(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S, `thisArg?`: any): S[]

*Inherited from [DeepArray](deeparray.md).[filter](deeparray.md#filter)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1355*

Returns the elements of an array that meet the condition specified in a callback function.

#### Type parameters:

Name | Type |
------ | ------ |
`S` | T \| [DeepArray](deeparray.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
`thisArg?` | any | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** S[]

▸ **filter**(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown, `thisArg?`: any): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[filter](deeparray.md#filter)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1361*

Returns the elements of an array that meet the condition specified in a callback function.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
`thisArg?` | any | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

___

### find

▸ **find**<S\>(`predicate`: (this: void, value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S, `thisArg?`: any): S \| undefined

*Inherited from [DeepArray](deeparray.md).[find](deeparray.md#find)*

*Defined in node_modules/typescript/lib/lib.es2015.core.d.ts:31*

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

#### Type parameters:

Name | Type |
------ | ------ |
`S` | T \| [DeepArray](deeparray.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (this: void, value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => value is S | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, find immediately returns that element value. Otherwise, find returns undefined. |
`thisArg?` | any | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead.  |

**Returns:** S \| undefined

▸ **find**(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown, `thisArg?`: any): T \| [DeepArray](deeparray.md)<T\> \| undefined

*Inherited from [DeepArray](deeparray.md).[find](deeparray.md#find)*

*Defined in node_modules/typescript/lib/lib.es2015.core.d.ts:32*

#### Parameters:

Name | Type |
------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown |
`thisArg?` | any |

**Returns:** T \| [DeepArray](deeparray.md)<T\> \| undefined

___

### findIndex

▸ **findIndex**(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown, `thisArg?`: any): number

*Inherited from [DeepArray](deeparray.md).[findIndex](deeparray.md#findindex)*

*Defined in node_modules/typescript/lib/lib.es2015.core.d.ts:43*

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, obj: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, findIndex immediately returns that element index. Otherwise, findIndex returns -1. |
`thisArg?` | any | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead.  |

**Returns:** number

___

### forEach

▸ **forEach**(`callbackfn`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => void, `thisArg?`: any): void

*Inherited from [DeepArray](deeparray.md).[forEach](deeparray.md#foreach)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1343*

Performs the specified action for each element in an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => void | A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array. |
`thisArg?` | any | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** void

___

### includes

▸ **includes**(`searchElement`: T \| [DeepArray](deeparray.md)<T\>, `fromIndex?`: number): boolean

*Inherited from [DeepArray](deeparray.md).[includes](deeparray.md#includes)*

*Defined in node_modules/typescript/lib/lib.es2016.array.include.d.ts:27*

Determines whether an array includes a certain element, returning true or false as appropriate.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`searchElement` | T \| [DeepArray](deeparray.md)<T\> | The element to search for. |
`fromIndex?` | number | The position in this array at which to begin searching for searchElement.  |

**Returns:** boolean

___

### indexOf

▸ **indexOf**(`searchElement`: T \| [DeepArray](deeparray.md)<T\>, `fromIndex?`: number): number

*Inherited from [DeepArray](deeparray.md).[indexOf](deeparray.md#indexof)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1304*

Returns the index of the first occurrence of a value in an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`searchElement` | T \| [DeepArray](deeparray.md)<T\> | The value to locate in the array. |
`fromIndex?` | number | The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.  |

**Returns:** number

___

### join

▸ **join**(`separator?`: string): string

*Inherited from [DeepArray](deeparray.md).[join](deeparray.md#join)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1256*

Adds all the elements of an array separated by the specified separator string.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`separator?` | string | A string used to separate one element of an array from the next in the resulting String. If omitted, the array elements are separated with a comma.  |

**Returns:** string

___

### keys

▸ **keys**(): IterableIterator<number\>

*Inherited from [DeepArray](deeparray.md).[keys](deeparray.md#keys)*

*Defined in node_modules/typescript/lib/lib.es2015.iterable.d.ts:70*

Returns an iterable of keys in the array

**Returns:** IterableIterator<number\>

___

### lastIndexOf

▸ **lastIndexOf**(`searchElement`: T \| [DeepArray](deeparray.md)<T\>, `fromIndex?`: number): number

*Inherited from [DeepArray](deeparray.md).[lastIndexOf](deeparray.md#lastindexof)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1310*

Returns the index of the last occurrence of a specified value in an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`searchElement` | T \| [DeepArray](deeparray.md)<T\> | The value to locate in the array. |
`fromIndex?` | number | The array index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the array.  |

**Returns:** number

___

### map

▸ **map**<U\>(`callbackfn`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U, `thisArg?`: any): U[]

*Inherited from [DeepArray](deeparray.md).[map](deeparray.md#map)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1349*

Calls a defined callback function on each element of an array, and returns an array that contains the results.

#### Type parameters:

Name |
------ |
`U` |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U | A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array. |
`thisArg?` | any | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** U[]

___

### pop

▸ **pop**(): T \| [DeepArray](deeparray.md)<T\> \| undefined

*Inherited from [DeepArray](deeparray.md).[pop](deeparray.md#pop)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1236*

Removes the last element from an array and returns it.

**Returns:** T \| [DeepArray](deeparray.md)<T\> \| undefined

___

### push

▸ **push**(...`items`: (T \| [DeepArray](deeparray.md)<T\>)[]): number

*Inherited from [DeepArray](deeparray.md).[push](deeparray.md#push)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1241*

Appends new elements to an array, and returns the new length of the array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`...items` | (T \| [DeepArray](deeparray.md)<T\>)[] | New elements of the Array.  |

**Returns:** number

___

### reduce

▸ **reduce**(`callbackfn`: (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\>): T \| [DeepArray](deeparray.md)<T\>

*Inherited from [DeepArray](deeparray.md).[reduce](deeparray.md#reduce)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1367*

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\> | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |

**Returns:** T \| [DeepArray](deeparray.md)<T\>

▸ **reduce**(`callbackfn`: (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\>, `initialValue`: T \| [DeepArray](deeparray.md)<T\>): T \| [DeepArray](deeparray.md)<T\>

*Inherited from [DeepArray](deeparray.md).[reduce](deeparray.md#reduce)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1368*

#### Parameters:

Name | Type |
------ | ------ |
`callbackfn` | (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\> |
`initialValue` | T \| [DeepArray](deeparray.md)<T\> |

**Returns:** T \| [DeepArray](deeparray.md)<T\>

▸ **reduce**<U\>(`callbackfn`: (previousValue: U, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U, `initialValue`: U): U

*Inherited from [DeepArray](deeparray.md).[reduce](deeparray.md#reduce)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1374*

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters:

Name |
------ |
`U` |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (previousValue: U, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |
`initialValue` | U | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.  |

**Returns:** U

___

### reduceRight

▸ **reduceRight**(`callbackfn`: (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\>): T \| [DeepArray](deeparray.md)<T\>

*Inherited from [DeepArray](deeparray.md).[reduceRight](deeparray.md#reduceright)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1380*

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\> | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |

**Returns:** T \| [DeepArray](deeparray.md)<T\>

▸ **reduceRight**(`callbackfn`: (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\>, `initialValue`: T \| [DeepArray](deeparray.md)<T\>): T \| [DeepArray](deeparray.md)<T\>

*Inherited from [DeepArray](deeparray.md).[reduceRight](deeparray.md#reduceright)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1381*

#### Parameters:

Name | Type |
------ | ------ |
`callbackfn` | (previousValue: T \| [DeepArray](deeparray.md)<T\>, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => T \| [DeepArray](deeparray.md)<T\> |
`initialValue` | T \| [DeepArray](deeparray.md)<T\> |

**Returns:** T \| [DeepArray](deeparray.md)<T\>

▸ **reduceRight**<U\>(`callbackfn`: (previousValue: U, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U, `initialValue`: U): U

*Inherited from [DeepArray](deeparray.md).[reduceRight](deeparray.md#reduceright)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1387*

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters:

Name |
------ |
`U` |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callbackfn` | (previousValue: U, currentValue: T \| [DeepArray](deeparray.md)<T\>, currentIndex: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => U | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |
`initialValue` | U | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.  |

**Returns:** U

___

### reverse

▸ **reverse**(): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[reverse](deeparray.md#reverse)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1260*

Reverses the elements in an Array.

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

___

### shift

▸ **shift**(): T \| [DeepArray](deeparray.md)<T\> \| undefined

*Inherited from [DeepArray](deeparray.md).[shift](deeparray.md#shift)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1264*

Removes the first element from an array and returns it.

**Returns:** T \| [DeepArray](deeparray.md)<T\> \| undefined

___

### slice

▸ **slice**(`start?`: number, `end?`: number): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[slice](deeparray.md#slice)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1270*

Returns a section of an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`start?` | number | The beginning of the specified portion of the array. |
`end?` | number | The end of the specified portion of the array. This is exclusive of the element at the index 'end'.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

___

### some

▸ **some**(`predicate`: (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown, `thisArg?`: any): boolean

*Inherited from [DeepArray](deeparray.md).[some](deeparray.md#some)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1337*

Determines whether the specified callback function returns true for any element of an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`predicate` | (value: T \| [DeepArray](deeparray.md)<T\>, index: number, array: (T \| [DeepArray](deeparray.md)<T\>)[]) => unknown | A function that accepts up to three arguments. The some method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array. |
`thisArg?` | any | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.  |

**Returns:** boolean

___

### sort

▸ **sort**(`compareFn?`: (a: T \| [DeepArray](deeparray.md)<T\>, b: T \| [DeepArray](deeparray.md)<T\>) => number): this

*Inherited from [DeepArray](deeparray.md).[sort](deeparray.md#sort)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1280*

Sorts an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`compareFn?` | (a: T \| [DeepArray](deeparray.md)<T\>, b: T \| [DeepArray](deeparray.md)<T\>) => number | Function used to determine the order of the elements. It is expected to return a negative value if first argument is less than second argument, zero if they're equal and a positive value otherwise. If omitted, the elements are sorted in ascending, ASCII character order. ```ts [11,2,22,1].sort((a, b) => a - b) ```  |

**Returns:** this

___

### splice

▸ **splice**(`start`: number, `deleteCount?`: number): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[splice](deeparray.md#splice)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1286*

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`start` | number | The zero-based location in the array from which to start removing elements. |
`deleteCount?` | number | The number of elements to remove.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

▸ **splice**(`start`: number, `deleteCount`: number, ...`items`: (T \| [DeepArray](deeparray.md)<T\>)[]): (T \| [DeepArray](deeparray.md)<T\>)[]

*Inherited from [DeepArray](deeparray.md).[splice](deeparray.md#splice)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1293*

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`start` | number | The zero-based location in the array from which to start removing elements. |
`deleteCount` | number | The number of elements to remove. |
`...items` | (T \| [DeepArray](deeparray.md)<T\>)[] | Elements to insert into the array in place of the deleted elements.  |

**Returns:** (T \| [DeepArray](deeparray.md)<T\>)[]

___

### toLocaleString

▸ **toLocaleString**(): string

*Inherited from [DeepArray](deeparray.md).[toLocaleString](deeparray.md#tolocalestring)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1232*

Returns a string representation of an array. The elements are converted to string using their toLocalString methods.

**Returns:** string

___

### toString

▸ **toString**(): string

*Inherited from [DeepArray](deeparray.md).[toString](deeparray.md#tostring)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1228*

Returns a string representation of an array.

**Returns:** string

___

### unshift

▸ **unshift**(...`items`: (T \| [DeepArray](deeparray.md)<T\>)[]): number

*Inherited from [DeepArray](deeparray.md).[unshift](deeparray.md#unshift)*

*Defined in node_modules/typescript/lib/lib.es5.d.ts:1298*

Inserts new elements at the start of an array.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`...items` | (T \| [DeepArray](deeparray.md)<T\>)[] | Elements to insert at the start of the Array.  |

**Returns:** number

___

### values

▸ **values**(): IterableIterator<T \| [DeepArray](deeparray.md)<T\>\>

*Inherited from [DeepArray](deeparray.md).[values](deeparray.md#values)*

*Defined in node_modules/typescript/lib/lib.es2015.iterable.d.ts:75*

Returns an iterable of values in the array

**Returns:** IterableIterator<T \| [DeepArray](deeparray.md)<T\>\>
