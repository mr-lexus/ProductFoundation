# AI Development Rules — RPC Protocol

`@product-foundation/rpc` owns only versioned protocol types, envelopes, public
error codes and contract definition helpers. It must not contain product
procedures, HTTP framework code, fetch logic or server execution behavior.

Protocol changes require compatibility review and boundary tests.

Protocol schemas must describe stable JSON wire values. Do not expose `Date`,
`BigInt`, class instances, non-finite numbers, circular structures or schema
transformations whose result changes after a JSON round trip and repeated parse.
