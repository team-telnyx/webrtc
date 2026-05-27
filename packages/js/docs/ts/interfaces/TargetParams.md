Optional parameters to pass to the target during anonymous login.
These are forwarded to voice-sdk-proxy and mapped to custom headers on the SIP INVITE.

Known keys are typed explicitly for discoverability and autocomplete.
Unknown keys are still accepted and forwarded as-is.

**`Example`**

```ts
target_params: {
  conversation_id: 'conv-123',  // → X-AI-Assistant-Conversation-ID
}
```

## Table of contents

### Properties

- [conversation_id](#conversation_id)

## Properties

### conversation_id

• `Optional` **conversation_id**: `string`

The conversation ID to join an existing conversation.
Mapped to `X-AI-Assistant-Conversation-ID` on the SIP INVITE.
