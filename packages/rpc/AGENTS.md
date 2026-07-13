# AI Development Rules — RPC Protocol

`@product-foundation/rpc` owns only versioned protocol types, envelopes, public
error codes and contract definition helpers. It must not contain product
procedures, HTTP framework code, fetch logic or server execution behavior.

Protocol changes require compatibility review and boundary tests.
