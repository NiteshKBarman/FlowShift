/**
 * Type IR — Language-neutral type representations.
 *
 * These types describe the *semantic* type of a value in the Program IR,
 * abstracted away from any specific language's type syntax.
 */

import type { SourceLocation } from './source-location';

// ─── Primitive Types ─────────────────────────────────────────────

export type PrimitiveTypeName =
  | 'int'
  | 'float'
  | 'double'
  | 'char'
  | 'string'
  | 'bool'
  | 'void';

export interface PrimitiveType {
  readonly kind: 'primitive';
  readonly name: PrimitiveTypeName;
}

// ─── Array Type ──────────────────────────────────────────────────

export interface ArrayType {
  readonly kind: 'array';
  readonly elementType: IRType;
  readonly size?: number; // undefined = dynamic
}

// ─── Pointer Type ────────────────────────────────────────────────

export interface PointerType {
  readonly kind: 'pointer';
  readonly pointeeType: IRType;
}

// ─── Function Type ───────────────────────────────────────────────

export interface FunctionType {
  readonly kind: 'function';
  readonly parameterTypes: readonly IRType[];
  readonly returnType: IRType;
}

// ─── User-Defined Type (class, struct, etc.) ─────────────────────

export interface UserDefinedType {
  readonly kind: 'user-defined';
  readonly name: string;
  readonly sourceLocation?: SourceLocation;
}

// ─── Generic/Template Type ───────────────────────────────────────

export interface GenericType {
  readonly kind: 'generic';
  readonly name: string;
  readonly typeArguments: readonly IRType[];
}

// ─── Unknown Type (for graceful degradation) ─────────────────────

export interface UnknownType {
  readonly kind: 'unknown';
  readonly rawText?: string;
}

// ─── Auto/Inferred Type ──────────────────────────────────────────

export interface InferredType {
  readonly kind: 'inferred';
}

// ─── Discriminated Union ─────────────────────────────────────────

export type IRType =
  | PrimitiveType
  | ArrayType
  | PointerType
  | FunctionType
  | UserDefinedType
  | GenericType
  | UnknownType
  | InferredType;

// ─── Type Constructors ──────────────────────────────────────────

export function primitiveType(name: PrimitiveTypeName): PrimitiveType {
  return { kind: 'primitive', name };
}

export function arrayType(elementType: IRType, size?: number): ArrayType {
  return { kind: 'array', elementType, size };
}

export function pointerType(pointeeType: IRType): PointerType {
  return { kind: 'pointer', pointeeType };
}

export function functionType(
  parameterTypes: readonly IRType[],
  returnType: IRType
): FunctionType {
  return { kind: 'function', parameterTypes, returnType };
}

export function userDefinedType(name: string): UserDefinedType {
  return { kind: 'user-defined', name };
}

export function genericType(
  name: string,
  typeArguments: readonly IRType[]
): GenericType {
  return { kind: 'generic', name, typeArguments };
}

export function unknownType(rawText?: string): UnknownType {
  return { kind: 'unknown', rawText };
}

export function inferredType(): InferredType {
  return { kind: 'inferred' };
}

// ─── Type Utilities ──────────────────────────────────────────────

export function isVoid(type: IRType): boolean {
  return type.kind === 'primitive' && type.name === 'void';
}

export function isNumeric(type: IRType): boolean {
  return (
    type.kind === 'primitive' &&
    (type.name === 'int' || type.name === 'float' || type.name === 'double')
  );
}

export function typeToString(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      return type.name;
    case 'array':
      return `${typeToString(type.elementType)}[${type.size ?? ''}]`;
    case 'pointer':
      return `${typeToString(type.pointeeType)}*`;
    case 'function':
      return `(${type.parameterTypes.map(typeToString).join(', ')}) => ${typeToString(type.returnType)}`;
    case 'user-defined':
      return type.name;
    case 'generic':
      return `${type.name}<${type.typeArguments.map(typeToString).join(', ')}>`;
    case 'unknown':
      return type.rawText ?? 'unknown';
    case 'inferred':
      return 'auto';
  }
}
