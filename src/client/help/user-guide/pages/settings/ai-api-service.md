# AI API Service

Use **AI API Service** settings to choose which Gemini-backed provider powers DCC's OpenAI-compatible API routes.

## What this section controls

The selected service is used by API endpoints such as:

- `GET /v1/models`
- `POST /v1/chat/completions`

This lets clients integrate with DCC as an OpenAI-compatible facade while still routing to your chosen Gemini backend.

---

## Gemini client selector

### Field

- **Gemini client**:
  - **Gemini Connector**
  - **Gemini AI Studio**

### Behavior

- Changing this value switches which credential/model form is shown.
- Save after changing so server routes use the selected backend.

---

## Gemini AI Studio settings

Use this option when calling Gemini via Google AI Studio credentials.

### Fields

- **API key**
- **Model** (for example `gemini-2.5-pro`)

### Typical setup

1. Select **Gemini AI Studio** in **Gemini client**.
2. Enter your API key and model.
3. Click **Save AI API settings**.
4. Click **Get Models** to verify connectivity.

---

## Gemini Connector settings

Use this option when routing through a Gemini Connector service.

### Fields

- **Connector ID**
- **Base URL** (for example `http://localhost:3999`)
- **API key**
- **Model** (for example `gemini-2.5-pro`)

### Typical setup

1. Select **Gemini Connector** in **Gemini client**.
2. Enter connector details.
3. Click **Save AI API settings**.
4. Click **Get Models** to validate the connection.

---

## Actions

- **Save AI API settings**: persists the selected client and related credentials.
- **Open API Swagger**: opens interactive API docs for testing routes.
- **Get Models**: calls the configured backend through DCC and lists available models.

If **Get Models** fails, re-check client selection, URL, API key, and model name.
