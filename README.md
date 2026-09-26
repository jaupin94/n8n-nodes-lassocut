# n8n-nodes-lassocut

An [n8n](https://n8n.io/) community node for [LassoCut](https://www.lassocut.com): remove the background of images in your workflows. The LassoCut API is compatible with the remove.bg API, so you can move a remove.bg-based workflow to LassoCut by swapping the node. The options and output stay the same.

## Installation

In n8n, go to **Settings > Community Nodes**, click **Install** and enter `n8n-nodes-lassocut`.

See the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for more details.

## Credentials

1. Create an account and copy your API key from https://www.lassocut.com/account/.
2. In n8n, create a **LassoCut API** credential and paste the key.

The key is sent in the `X-Api-Key` header. n8n tests it against the account endpoint when you save the credential.

## Operation

**Image > Remove Background**: sends an image to LassoCut and returns the cut-out image.

- **Input**: choose **Binary File** (the name of the input binary field, `data` by default) or **Image URL** (a public URL).
- **Output Binary Field**: the binary field that receives the result (`data` by default). The file is named `<original name>-removebg.<ext>`.
- **Options**:
  - **Size**: `full` (default), `preview`, `auto`
  - **Subject Type**: `auto`, `person`, `product`, `car`, `animal`, `graphic`
  - **Format**: `png` (default), `jpg`, `webp`
  - **Background Colour**: hex code (`ffffff`) or colour name (`white`). Leave it empty for a transparent background.
  - **Crop to Subject**: removes the empty space around the subject
  - **Crop Margin**: for example `10%` or `30px`

Each output item also carries these JSON fields: `credits_charged`, `width`, `height` and `detected_type`.

The node shows API errors (invalid key, insufficient credits, rate limit and so on) as readable messages, and it supports **Continue On Fail**.

## Resources

- [LassoCut API documentation](https://www.lassocut.com/docs/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

MIT

---

remove.bg is a trademark of Canva Austria GmbH. LassoCut is not affiliated with remove.bg or Canva.
