# V4 Connect CRM API Documentation

## Overview

The V4 Connect CRM API provides a RESTful interface for managing omnichannel customer communications, CRM pipelines, campaigns, and automations.

**Base URL:** `https://api.v4connect.com.br/api/v1`

**Swagger UI:** Available at `/docs` when running the API server.

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require a valid JWT token.

### Obtaining a Token

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

## Rate Limiting

- **Authenticated routes:** 100 requests per minute
- **Authentication routes:** 10 requests per minute

## Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login user |
| POST | `/auth/register` | Register new tenant and user |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/me` | Get current user |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conversations` | List conversations |
| GET | `/conversations/:id` | Get conversation by ID |
| GET | `/conversations/:id/messages` | Get conversation messages |
| PATCH | `/conversations/:id/status` | Update conversation status |
| PATCH | `/conversations/:id/assign` | Assign conversation to user |
| POST | `/conversations/:id/typing` | Send typing indicator |

**Query Parameters for listing:**
- `status`: Filter by status (open, pending, resolved, snoozed)
- `assigneeId`: Filter by assigned user
- `channelId`: Filter by channel
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/messages` | Send a message |
| POST | `/messages/upload` | Upload and send media |
| GET | `/messages/:id` | Get message by ID |
| DELETE | `/messages/:id` | Delete message |

**Send Message Request:**
```json
{
  "conversationId": "uuid",
  "content": "Hello!",
  "type": "text"
}
```

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts` | List contacts |
| POST | `/contacts` | Create contact |
| GET | `/contacts/:id` | Get contact by ID |
| PATCH | `/contacts/:id` | Update contact |
| DELETE | `/contacts/:id` | Delete contact |

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/channels` | List channels |
| POST | `/channels` | Create channel |
| GET | `/channels/:id` | Get channel by ID |
| PATCH | `/channels/:id` | Update channel |
| DELETE | `/channels/:id` | Delete channel |
| POST | `/channels/:id/connect` | Connect channel |
| POST | `/channels/:id/disconnect` | Disconnect channel |

**Supported Channel Types:**
- `whatsapp` (Evolution API or Meta Business API)
- `instagram` (Meta Business API)
- `messenger` (Meta Business API)

### CRM - Pipelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pipelines` | List pipelines |
| POST | `/pipelines` | Create pipeline |
| GET | `/pipelines/:id` | Get pipeline with stages |
| PATCH | `/pipelines/:id` | Update pipeline |
| DELETE | `/pipelines/:id` | Delete pipeline |
| POST | `/pipelines/:id/stages` | Add stage |
| PATCH | `/pipelines/:pipelineId/stages/:stageId` | Update stage |
| DELETE | `/pipelines/:pipelineId/stages/:stageId` | Delete stage |

### CRM - Deals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deals` | List deals |
| POST | `/deals` | Create deal |
| GET | `/deals/:id` | Get deal by ID |
| PATCH | `/deals/:id` | Update deal |
| DELETE | `/deals/:id` | Delete deal |
| PATCH | `/deals/:id/move` | Move deal to stage |
| POST | `/deals/:id/activities` | Add activity |

**Deal Status Values:**
- `open`: Active deal
- `won`: Won/closed deal
- `lost`: Lost deal

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Get campaign by ID |
| PATCH | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |
| POST | `/campaigns/:id/schedule` | Schedule campaign |
| POST | `/campaigns/:id/pause` | Pause campaign |
| POST | `/campaigns/:id/resume` | Resume campaign |
| GET | `/campaigns/:id/stats` | Get campaign statistics |

### Chatbots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chatbots` | List chatbots |
| POST | `/chatbots` | Create chatbot |
| GET | `/chatbots/:id` | Get chatbot with flow |
| PATCH | `/chatbots/:id` | Update chatbot |
| DELETE | `/chatbots/:id` | Delete chatbot |
| PATCH | `/chatbots/:id/toggle` | Toggle active status |
| POST | `/chatbots/:id/nodes` | Add flow node |
| PATCH | `/chatbots/:id/nodes/:nodeId` | Update node |
| DELETE | `/chatbots/:id/nodes/:nodeId` | Delete node |
| POST | `/chatbots/:id/edges` | Add flow edge |
| DELETE | `/chatbots/:id/edges/:edgeId` | Delete edge |

**Node Types:**
- `start`: Flow entry point
- `message`: Send message to contact
- `condition`: Branch based on conditions
- `action`: Execute action (tag, assign, webhook)
- `delay`: Wait for specified time
- `end`: End flow execution

### Automations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/automations` | List automations |
| POST | `/automations` | Create automation |
| GET | `/automations/:id` | Get automation by ID |
| PATCH | `/automations/:id` | Update automation |
| DELETE | `/automations/:id` | Delete automation |
| PATCH | `/automations/:id/activate` | Activate automation |
| PATCH | `/automations/:id/pause` | Pause automation |
| GET | `/automations/:id/logs` | Get execution logs |

**Trigger Types:**
- `message_received`: When a new message arrives
- `conversation_opened`: When conversation is opened
- `conversation_resolved`: When conversation is resolved
- `contact_created`: When a new contact is created
- `deal_stage_changed`: When deal moves to a stage
- `deal_created`: When a new deal is created
- `tag_added`: When a tag is added to contact
- `tag_removed`: When a tag is removed from contact

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | Get overview metrics |
| GET | `/analytics/conversations/daily` | Daily conversation counts |
| GET | `/analytics/conversations/by-status` | Conversations by status |
| GET | `/analytics/conversations/by-channel` | Conversations by channel |
| GET | `/analytics/response-time` | Response time metrics |
| GET | `/analytics/response-time/by-agent` | Response time by agent |
| GET | `/analytics/agents` | Agent performance metrics |
| GET | `/analytics/campaigns` | Campaign metrics |
| GET | `/analytics/campaigns/performance` | Campaign performance list |
| GET | `/analytics/export/:type` | Export report (json/csv) |

**Export Types:**
- `overview`: General metrics
- `conversations`: Conversation details
- `agents`: Agent performance
- `campaigns`: Campaign performance

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | List teams |
| POST | `/teams` | Create team |
| GET | `/teams/:id` | Get team by ID |
| PATCH | `/teams/:id` | Update team |
| DELETE | `/teams/:id` | Delete team |
| POST | `/teams/:id/members` | Add member |
| DELETE | `/teams/:id/members/:userId` | Remove member |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| PATCH | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag |
| GET | `/tags/:id/contacts` | Get contacts with tag |
| POST | `/tags/:id/contacts/bulk` | Bulk add tag to contacts |

### Quick Replies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quick-replies` | List quick replies |
| POST | `/quick-replies` | Create quick reply |
| PATCH | `/quick-replies/:id` | Update quick reply |
| DELETE | `/quick-replies/:id` | Delete quick reply |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |

### Invites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invites` | List pending invites |
| POST | `/invites` | Create invite |
| DELETE | `/invites/:id` | Revoke invite |
| POST | `/invites/:id/resend` | Resend invite email |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/avatar` | Upload user avatar |
| POST | `/upload/attachment` | Upload conversation attachment |
| POST | `/upload/media` | Upload media file |

## Webhooks

### Evolution API (WhatsApp)

Configure your Evolution API instance to send webhooks to:
```
POST /api/v1/webhooks/evolution/{channelId}
```

### Meta (Instagram/Messenger)

Configure your Meta App webhook URL to:
```
POST /meta/webhook
GET /meta/webhook (for verification)
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

**Common Status Codes:**
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Invalid or missing token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination info:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## WebSocket Events

Real-time events are delivered via WebSocket connection.

**Connection:**
```javascript
const ws = new WebSocket('wss://api.v4connect.com.br/ws');
ws.send(JSON.stringify({ type: 'auth', token: 'your-jwt-token' }));
```

**Events:**
- `conversation:new` - New conversation created
- `conversation:updated` - Conversation status changed
- `message:new` - New message received
- `message:status` - Message delivery status updated
- `notification:new` - New notification
