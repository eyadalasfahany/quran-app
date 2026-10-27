declare module '*.sql' {
  const source: string;
  export default source;
}

declare module '*.db' {
  const assetId: number;
  export default assetId;
}
