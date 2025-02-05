import {
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql/type';

type Mapper<T, R> = (id: string, item: T) => R | null;
type Payload<T, R> = {
  items: T[];
  mapper: Mapper<T, R>;
  idParts: string[];
};

const SEPARATOR = "::";

function joinParts(parts: string[]) {
  return parts.join(SEPARATOR);
}

export function typeNameToId(name: string) {
  return joinParts(["TYPE", name]);
}

export function typeObjToId(type: GraphQLNamedType) {
  return typeNameToId(type.name);
}

export function extractTypeName(typeID: string): string {
  const [, type] = typeID.split(SEPARATOR);

  return type;
}

function getDerivedTypes(schema: GraphQLSchema, type: GraphQLNamedType) {
  const { interfaces, objects } = schema.getImplementations(type);

  return [...interfaces, ...objects];
};

function mapItems<T extends { name: string }, R>({
  items,
  mapper,
  idParts,
}: Payload<T, R>) {
  return items.reduce((results: R[], item) => {
    const id = joinParts([...idParts, item.name]);
    const result = mapper(id, item);

    if (result != null) results.push(result);

    return results;
  }, []);
}

export function mapFields<R>(
  type: GraphQLNamedType,
  mapper: Mapper<GraphQLField<any, any>, R>
) {
  const isValidType = isInterfaceType(type) || isObjectType(type);

  if (!isValidType) return [];

  return mapItems({
    items: Object.values(type.getFields()),
    mapper,
    idParts: ["FIELD", type.name],
  });
}

export function mapPossibleTypes<R>(
  type: GraphQLNamedType,
  mapper: Mapper<GraphQLObjectType, R>
) {
  if (!isUnionType(type)) return [];

  return mapItems({
    items: type.getTypes(),
    mapper,
    idParts: ["POSSIBLE_TYPE", type.name],
  });
}

export function mapDerivedTypes<R>(
  schema: GraphQLSchema,
  type: GraphQLNamedType,
  mapper: Mapper<GraphQLObjectType | GraphQLInterfaceType, R>
) {
  if (!isInterfaceType(type)) return [];

  return mapItems({
    items: getDerivedTypes(schema, type),
    mapper,
    idParts: ["DERIVED_TYPE", type.name],
  });
}

export function mapInterfaces<R>(
  type: GraphQLNamedType,
  mapper: Mapper<GraphQLNamedType, R>
) {
  const isValidType = isInterfaceType(type) || isObjectType(type);

  if (!isValidType) return [];

  return mapItems({
    items: type.getInterfaces(),
    mapper,
    idParts: ["INTERFACE", type.name],
  });
}
