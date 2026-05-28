Optional parameters to pass to the target during anonymous login.
These are forwarded to voice-sdk-proxy and mapped to custom headers on the SIP INVITE.

Known keys are typed explicitly for discoverability and autocomplete.
Unknown keys are still accepted and forwarded as-is.

`conversation_id` is not a customer-defined correlation ID. Set it only
when you want the WebRTC call to join an existing Telnyx AI conversation
that belongs to the same project/account. Omit it to start a new AI
Assistant conversation.

**`Example`**

Start a new AI Assistant conversation (most common)

```ts
anonymous_login: {
  target_id: 'assistant-UUID',
  target_type: 'ai_assistant',
}
```

**`Example`**

Join an existing Telnyx AI conversation

```ts
anonymous_login: {
  target_id: 'assistant-UUID',
  target_type: 'ai_assistant',
  target_params: {
    conversation_id: 'existing-telnyx-conversation-id', // → X-AI-Assistant-Conversation-ID
  },
}
```

## Table of contents

### Properties

- [conversation_id](#conversation_id)

## Properties

### conversation_id

• `Optional` **conversation_id**: `string`

Telnyx AI conversation ID to join.

When omitted, the TeXML endpoint starts a new conversation by rendering
`<AIAssistant id="...">`. When provided, voice-sdk-proxy maps the value
to `X-AI-Assistant-Conversation-ID` on the SIP INVITE, and the TeXML
endpoint renders `<AIAssistant join="...">` to attach the call to that
existing conversation.

Do not use this field for application session tracking or as an external
correlation ID. If the ID does not exist, or does not belong to the caller's
project/account, the join attempt fails (for example with AI Assistant
error code `10007`: `The conversation does not exist or does not belong to
this user`).
