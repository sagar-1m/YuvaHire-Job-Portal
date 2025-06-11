// Standard API Response class for consistent API responses

class ApiResponse {
  constructor(statusCode, message = "Succcess", data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400; // true for 2xx and 3xx, false for 4xx and 5xx
  }
}

export default ApiResponse;
