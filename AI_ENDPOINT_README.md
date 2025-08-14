# AI Endpoint Documentation

## Endpoint: `/api/ai`

### Method: POST

This endpoint allows you to send text content along with an image file to OpenAI's GPT-4 Vision API for analysis.

### Request Format

The request should be a `multipart/form-data` with the following fields:

- `text` (required): The text content/question you want to ask about the image
- `image` (required): The image file to analyze

### Example Usage

#### Using cURL:
```bash
curl -X POST http://localhost:5001/api/ai \
  -F "text=What do you see in this image?" \
  -F "image=@/path/to/your/image.jpg"
```

#### Using JavaScript/Fetch:
```javascript
const formData = new FormData();
formData.append('text', 'What do you see in this image?');
formData.append('image', imageFile); // imageFile should be a File object

const response = await fetch('http://localhost:5001/api/ai', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

#### Using Postman:
1. Set method to POST
2. Set URL to `http://localhost:5001/api/ai`
3. In Body tab, select `form-data`
4. Add key `text` with your question
5. Add key `image` with type `File` and select your image

### Response Format

#### Success Response:
```json
{
  "success": true,
  "response": "OpenAI's analysis of the image",
  "model": "gpt-4-vision-preview",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  }
}
```

#### Error Response:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

### Features

- **File Validation**: Only accepts image files (jpg, png, gif, etc.)
- **File Size Limit**: Maximum 10MB per image
- **Console Logging**: All requests and responses are logged to the server console
- **Error Handling**: Comprehensive error handling with detailed error messages
- **OpenAI Integration**: Uses GPT-4 Vision model for image analysis

### Requirements

- OpenAI API key must be set in `.env` file as `OPEN_AI_API_KEY`
- Server must be running on port 5001 (or configured port)
- Image file must be provided in the request

### Notes

- The endpoint converts the image to base64 format before sending to OpenAI
- All requests and responses are logged to the server console for debugging
- The OpenAI model used is "gpt-4-vision-preview"
- Maximum response tokens are limited to 1000
