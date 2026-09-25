# Changelog

## 0.1.2

- Identifies itself to the API (X-Lassocut-Client: n8n) so usage from n8n can be counted.

## 0.1.1

- Search aliases so the node shows up for "remove background", "remove bg", "background remover"...

## 0.1.0

- Initial release.
- `Lassocut API` credentials (API key sent as `X-Api-Key`, with a credential test).
- `lassocut` node with the **Image > Remove Background** operation: binary file or image URL input, and the Size, Subject Type, Format, Background Colour, Crop to Subject and Crop Margin options. Returns the result image as binary data along with credits charged, width, height and detected type. Supports Continue On Fail.
