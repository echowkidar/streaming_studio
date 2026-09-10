# Self-Hosted Live Streaming Studio
## Complete Product Requirements, Architecture and Implementation Specification

# 1. PROJECT OBJECTIVE

Build a complete self-hosted, browser-based live streaming, recording, webinar, multistreaming and video production platform.

The application should be functionally inspired by modern browser-based live production platforms such as StreamYard, but must use completely original branding, UI design, code, icons and assets.

The complete application must be deployable on a private Ubuntu server using:

- Docker
- Docker Compose
- Portainer
- Reverse Proxy
- HTTPS
- Custom domain/subdomain

The platform must be designed so that a single server installation can initially support a small number of concurrent broadcasts but can later scale horizontally.

The application name should initially be configurable through environment variables.

Example:

```env
APP_NAME=LiveStudio
APP_DOMAIN=studio.example.com
```

---

# 2. PRIMARY PRODUCT GOALS

The platform must allow a user to:

1. Create an account.
2. Create one or more workspaces.
3. Create reusable live studios.
4. Invite guests using a shareable URL.
5. Allow guests to join directly from a browser.
6. Manage camera, microphone and speaker devices.
7. Bring guests on/off the live stage.
8. Create professional layouts.
9. Add logos, overlays, backgrounds and banners.
10. Share screen.
11. Share slides and PDFs.
12. Play videos and audio.
13. Play intro and outro videos.
14. Record the live production.
15. Create individual local participant recordings.
16. Download recordings.
17. Stream to multiple destinations simultaneously.
18. Stream to custom RTMP servers.
19. Schedule live broadcasts.
20. Schedule pre-recorded broadcasts.
21. Create webinars.
22. Collect webinar registrations.
23. Embed webinars on external websites.
24. Show live comments on screen.
25. Create AI-generated short clips from recordings.
26. Generate transcripts and captions.
27. Support multiple producers and team members.
28. Support a Green Room.
29. Work fully inside modern desktop browsers.

---

# 3. USER TYPES AND ROLES

The application must support the following roles.

## 3.1 Super Admin

Global server administrator.

Permissions:

- Manage all users.
- Manage workspaces.
- View server usage.
- View active streams.
- Stop broadcasts.
- Manage storage.
- Manage system settings.
- Manage SMTP.
- Manage OAuth integrations.
- Manage streaming infrastructure.
- View logs.
- Manage feature flags.

---

## 3.2 Workspace Owner

Permissions:

- Full control over workspace.
- Manage members.
- Manage billing/feature limits if billing is implemented.
- Manage destinations.
- Manage brand assets.
- Create and delete studios.
- Create webinars.
- Access all recordings.

---

## 3.3 Admin

Permissions:

- Manage workspace members.
- Create broadcasts.
- Manage studios.
- Manage brand assets.
- Manage destinations.
- Start and stop broadcasts.

Cannot:

- Delete workspace.
- Change owner.
- Access global server administration.

---

## 3.4 Producer

Permissions:

- Enter studio.
- Control stage.
- Add/remove guests.
- Change layouts.
- Manage media.
- Start/stop recording.
- Start/stop broadcast.

---

## 3.5 Creator

Permissions:

- Create broadcasts.
- Host broadcasts.
- Manage their own broadcasts.

Optional limitation:

- Cannot manage workspace members.

---

## 3.6 Guest

Guests do not need an account.

Guests can:

- Open invitation link.
- Enter name.
- Select camera.
- Select microphone.
- Select speaker.
- Test devices.
- Join Green Room.
- Join backstage.
- Join stage when approved.

Optional feature:

- Guest can add their own streaming destinations.

---

## 3.7 Webinar Viewer

Can:

- Watch webinar.
- Register.
- Chat.
- React with emoji.
- View on-demand recording if enabled.

---

# 4. MAIN APPLICATION MODULES

The application must contain:

```text
Authentication
Dashboard
Workspaces
Team Management
Studios
Live Broadcasts
Recording Studio
Pre-Recorded Streaming
Webinars
Destinations
Brand Kit
Media Library
Video Library
AI Clips
Transcripts
Analytics
System Administration
```

---

# 5. DASHBOARD

The dashboard should display:

## Upcoming

- Scheduled broadcasts.
- Scheduled webinars.
- Scheduled pre-recorded streams.

## Live Now

- Currently live broadcasts.
- Current viewer count.
- Stream health.

## Recent Recordings

- Thumbnail.
- Title.
- Duration.
- Date.
- Download button.
- Open editor button.

## Quick Actions

Buttons:

```text
Create Live Stream
Record Video
Create Webinar
Upload Video
Create Studio
```

---

# 6. STUDIO ARCHITECTURE

The studio is the core component.

The UI should have the following sections.

```text
-------------------------------------------------------
Top Bar
-------------------------------------------------------
Left Sidebar | Main Preview | Right Participant Panel
             |              |
             |              |
-------------------------------------------------------
Bottom Controls
-------------------------------------------------------
```

---

# 7. STUDIO UI

## 7.1 Top Bar

Display:

- Broadcast title.
- Broadcast status.
- Recording status.
- Stream health.
- Connection quality.
- Viewer count.
- Go Live button.
- Record button.
- End Broadcast button.

Broadcast statuses:

```text
DRAFT
SCHEDULED
PREPARING
GREEN_ROOM
READY
RECORDING
LIVE
ENDED
FAILED
```

---

# 8. PARTICIPANT SYSTEM

The application must support:

- Host.
- Co-host.
- Producer.
- Guest.
- Audio-only participant.
- Extra camera source.
- Screen share source.

Each participant tile should show:

- Video.
- Display name.
- Mic status.
- Camera status.
- Connection quality.
- Network quality.
- Producer controls.

Actions:

```text
Add to Stage
Remove from Stage
Mute
Unmute
Disable Camera
Rename
Private Message
Move to Green Room
Remove from Broadcast
```

---

# 9. STAGE MANAGEMENT

The producer must be able to:

- Add participant to stage.
- Remove participant from stage.
- Rearrange participants.
- Drag and drop positions.
- Change layout.
- Pin a participant.
- Spotlight participant.
- Swap participants.
- Bring screen share to foreground.

The system should separate:

```text
BACKSTAGE PARTICIPANTS
STAGE PARTICIPANTS
GREEN ROOM PARTICIPANTS
```

---

# 10. LAYOUT ENGINE

Create an original layout engine.

Support at least:

1. Single speaker.
2. Two equal participants.
3. Two participants with large speaker.
4. Three equal participants.
5. Four grid.
6. Five grid.
7. Six grid.
8. Nine grid.
9. Ten grid.
10. Picture-in-picture.
11. Screen share with speaker.
12. Screen share full screen.
13. Presentation layout.
14. Podcast layout.
15. Interview layout.
16. Custom layout editor.

Layouts should automatically adapt when participants are added or removed.

The user must be able to save custom layouts.

---

# 11. CAMERA AND AUDIO

Support:

- Camera selection.
- Microphone selection.
- Speaker selection.
- Camera resolution selection.
- Echo cancellation.
- Noise suppression.
- Auto gain control.
- Stereo audio where supported.
- Audio-only mode.
- Device testing.

Show:

```text
Mic meter
Audio activity
Network quality
Packet loss
Bitrate
Resolution
FPS
```

---

# 12. EXTRA CAMERA

Support at least one additional camera per host.

Requirements:

- Extra camera should appear as a separate video source.
- Extra camera should not duplicate microphone audio.
- Producer can add/remove it from stage.
- Extra camera should work as a normal video source.

Future architecture should support multiple camera sources.

---

# 13. SCREEN SHARING

Support:

- Entire screen.
- Window.
- Browser tab.
- Browser tab audio where supported.

Producer should be able to:

- Add screen share to stage.
- Remove screen share.
- Change layout.
- Combine screen with participants.

---

# 14. BRAND KIT

Every workspace must have a brand management system.

Assets:

```text
Logos
Overlays
Background Images
Background Videos
Lower Thirds
Banners
Video Clips
Audio Clips
Intro Videos
Outro Videos
Fonts
Color Themes
```

Support folders.

Example:

```text
Workspace
 ├── Default Brand
 ├── YouTube Brand
 ├── Podcast Brand
 └── Client Brand
```

---

# 15. LOGOS

Allow:

- PNG.
- JPG.
- SVG.
- Transparent PNG.

Controls:

- Position.
- Size.
- Opacity.
- Enable/disable.
- Safe margins.

---

# 16. OVERLAYS

Support:

- Static image overlay.
- Animated video overlay.
- Transparent WebM overlay.

Controls:

```text
Add to Stage
Remove
Show
Hide
Position
Scale
Opacity
Layer Order
```

---

# 17. BACKGROUNDS

Support:

- Image background.
- Video background.
- Blur background.
- AI-generated virtual background.
- Transparent/no background where browser supports segmentation.

Optional AI background architecture:

```text
Participant Video
      ↓
Segmentation Model
      ↓
Background Removal
      ↓
New Background
      ↓
Composited Video
```

AI background processing should preferably happen locally in browser where possible.

---

# 18. BANNERS AND LOWER THIRDS

Provide a banner editor.

Fields:

```text
Title
Subtitle
Logo
Theme
Background
Animation
Duration
Position
```

Example:

```text
------------------------------------
John Smith
Founder, Example Company
------------------------------------
```

Features:

- Save templates.
- Animate in.
- Animate out.
- Automatically hide after configurable time.

---

# 19. TICKER / CRAWL TEXT

Support:

- Static ticker.
- Scrolling ticker.
- Breaking news style banner.

Controls:

- Direction.
- Speed.
- Font.
- Color.
- Background.
- Loop.
- Position.

---

# 20. VIDEO CLIPS

Users must be able to upload:

- MP4.
- WebM.
- MOV where server-side transcoding supports it.

Features:

- Preview.
- Trim.
- Loop.
- Add to stage.
- Play.
- Pause.
- Restart.
- Stop.

When a video plays:

- Prevent echo.
- Provide synchronized playback architecture.
- Allow host or producer to talk over video.

---

# 21. INTRO AND OUTRO

Each broadcast can have:

```text
Intro Video
Outro Video
```

Features:

- Play intro before live content.
- Transition automatically to live stage.
- Play outro before ending broadcast.
- Optionally stop RTMP stream after outro finishes.

---

# 22. SLIDES AND PDF PRESENTATION

Allow:

- PDF upload.
- PowerPoint conversion to images/PDF where possible.
- Image slides.

Controls:

```text
Next
Previous
Jump to Slide
Presenter Preview
Fullscreen
Add to Stage
```

Slides must be treated as a media source.

---

# 23. MEDIA LIBRARY

Create centralized media management.

Categories:

```text
Images
Videos
Audio
PDF
Slides
Brand Assets
Recordings
AI Clips
```

Requirements:

- Upload progress.
- Background transcoding.
- Thumbnail generation.
- Search.
- Folders.
- Tags.
- Delete.
- Download.
- Storage usage.

---

# 24. REAL-TIME VIDEO TRANSPORT

Use WebRTC.

Recommended architecture:

```text
Browser
   ↓ WebRTC
SFU
   ↓
Broadcast Compositor
   ↓
RTMP / HLS / Recording
```

Do not build a pure peer-to-peer mesh architecture for multi-participant production.

Use an SFU architecture.

Possible implementation choices:

```text
LiveKit
mediasoup
Janus
```

Recommended initial choice:

```text
LiveKit
```

Reason:

- Docker friendly.
- WebRTC SFU.
- Recording ecosystem.
- Scalable.
- Modern APIs.
- Good separation of media infrastructure and application logic.

---

# 25. SERVER-SIDE COMPOSITING

The server must create the final mixed program feed.

Concept:

```text
Participant A ─┐
Participant B ─┤
Screen Share ──┤
Media Source ──┤ → Compositor → Program Feed
Brand Assets ──┘
```

The final program feed should be used for:

```text
Live Streaming
Cloud Recording
Webinar Delivery
HLS Playback
Archive
```

Possible technologies:

```text
FFmpeg
GStreamer
LiveKit Egress
Custom compositor
```

Recommended initial architecture:

```text
LiveKit SFU
+
LiveKit Egress / FFmpeg
+
Custom layout/compositing service
```

---

# 26. LIVE STREAMING

The platform must support simultaneous streaming.

Destinations:

- YouTube.
- Facebook.
- Twitch.
- LinkedIn where API access is available.
- Custom RTMP.
- RTMPS.

Each destination stores:

```text
Name
Platform
RTMP URL
Stream Key (encrypted)
OAuth credentials if applicable
Status
Last Used
```

---

# 27. MULTISTREAMING

The system must send one program feed to multiple destinations.

Architecture:

```text
Program Feed
     │
     ├── Destination 1
     ├── Destination 2
     ├── Destination 3
     ├── Destination 4
     └── Custom RTMP
```

Each destination should have independent status:

```text
CONNECTING
LIVE
RECONNECTING
FAILED
STOPPED
```

The failure of one destination must not terminate other destinations.

---

# 28. STREAM HEALTH

Display for each destination:

- Connection status.
- Bitrate.
- FPS.
- Dropped frames.
- Reconnection count.
- Last error.
- Stream duration.

Provide automatic retry.

Example retry:

```text
Retry after 2 seconds
Retry after 5 seconds
Retry after 10 seconds
Retry after 30 seconds
```

Maximum retries configurable.

---

# 29. CUSTOM RTMP DESTINATIONS

Allow users to manually enter:

```text
RTMP URL
Stream Key
Destination Name
```

Security requirements:

- Encrypt stream keys at rest.
- Never expose decrypted stream keys in frontend API responses.
- Mask keys in UI.
- Require explicit confirmation before replacing keys.

---

# 30. GUEST DESTINATIONS

Optional advanced feature.

Allow a guest to:

- Log into their account.
- Add their own destination.
- Stream the host's broadcast to their own channels.

Architecture must ensure:

```text
Host destinations
+
Guest destinations
```

are independently managed.

Host must be able to remove a guest destination from a specific broadcast.

---

# 31. LIVE CHAT INTEGRATION

Create a unified chat system.

Architecture:

```text
YouTube Comments ─┐
Facebook Comments ┤
Twitch Chat ──────┤
Custom Webinar ───┤
                  ↓
             Unified Chat
                  ↓
              Studio UI
```

Each message should contain:

```text
Platform
Author
Avatar
Message
Timestamp
Platform Message ID
Moderation State
```

---

# 32. SHOW COMMENTS ON SCREEN

Producer can:

- Select a comment.
- Add comment to stage.
- Remove comment.
- Change theme.

Comment overlay should support:

```text
Avatar
Name
Platform Icon
Message
```

---

# 33. COMMENT MODERATION

Where platform APIs allow:

- Delete comment.
- Hide user.
- Ban user.
- Block user.

Create a moderation queue.

---

# 34. CLOUD RECORDING

Every broadcast can optionally be recorded.

Record:

```text
Final Program Feed
1080p
Audio
Branding
Overlays
Banners
Screen shares
Media clips
```

Recording should be available after processing.

Features:

- Playback.
- Download.
- Delete.
- Rename.
- Duplicate.
- Trim start/end.
- Generate clips.
- Generate transcript.

---

# 35. LOCAL RECORDING

Implement separate local recording for every participant.

Requirements:

- Recording happens locally in participant browser.
- Upload after session or continuously in chunks.
- Separate participant video.
- Separate participant audio.
- Clean feed without program overlays.

Preferred architecture:

```text
MediaRecorder
or
WebCodecs where supported
        ↓
Chunked Storage
        ↓
Background Upload
        ↓
Server Assembly
```

Must support recovery from temporary network interruption.

Use resumable uploads.

Recommended:

```text
tus protocol
or
multipart chunk upload
```

---

# 36. LOCAL RECORDING FILES

For each participant create:

```text
Participant Video Track
Participant Audio Track
Optional Combined Track
```

Also store:

```text
Session Start Timestamp
Synchronization Timestamp
Participant ID
Source Resolution
FPS
```

This allows editing systems to synchronize tracks.

---

# 37. RECORDING LIBRARY

Every recording must have:

```text
Title
Thumbnail
Date
Duration
Broadcast Type
Resolution
File Size
Storage Location
```

Actions:

```text
Play
Download
Rename
Duplicate
Trim
Delete
Generate Transcript
Generate AI Clips
Export Project
```

---

# 38. TRANSCRIPTS

Create automatic transcription.

Pipeline:

```text
Recording
   ↓
Extract Audio
   ↓
Speech-to-Text
   ↓
Timestamped Transcript
```

Possible engines:

```text
Whisper
faster-whisper
External AI API
```

Store:

```text
Timestamp
Speaker
Text
Confidence
```

Features:

- Search transcript.
- Download TXT.
- Download SRT.
- Download VTT.
- Edit transcript.

---

# 39. AI CLIPS

Create an AI-powered short clip generator.

Pipeline:

```text
Recording
    ↓
Transcript
    ↓
AI Analysis
    ↓
Detect Interesting Segments
    ↓
Score Segments
    ↓
Create Clips
    ↓
Generate Captions
    ↓
Render Vertical Video
```

Default formats:

```text
9:16
1080x1920
```

Optional:

```text
1:1
4:5
16:9
```

AI should identify:

- Interesting moments.
- Strong statements.
- Questions and answers.
- Emotional moments.
- Educational content.
- Viral potential.

Each clip should include:

```text
Title
Score
Start Time
End Time
Captions
Speaker Focus
```

---

# 40. AUTO REFRAINING FOR SHORTS

For vertical clips:

- Detect faces.
- Detect active speaker.
- Dynamically crop.
- Use split screen if multiple speakers.

Possible pipeline:

```text
Face Detection
+
Speaker Detection
+
Active Speaker Detection
+
Dynamic Crop
```

---

# 41. CAPTIONS

Support:

- Auto captions.
- Manual captions.
- Burned-in captions.
- SRT export.
- VTT export.

Caption styles:

```text
Classic
Bold
Word Highlight
Karaoke
Minimal
Custom
```

---

# 42. PRE-RECORDED LIVE STREAMING

Allow a user to upload a video and schedule it to stream automatically.

Workflow:

```text
Upload Video
      ↓
Validate
      ↓
Transcode if Required
      ↓
Select Destinations
      ↓
Set Date/Time
      ↓
Schedule
      ↓
Automatic Broadcast Start
```

The system must work even if the user is offline.

---

# 43. PRE-RECORDED STREAM VALIDATION

Validate:

- File format.
- Codec.
- Resolution.
- Audio.
- Bitrate.
- File size.

Recommended normalized output:

```text
MP4
H.264 video
AAC audio
Up to 1080p
```

---

# 44. SCHEDULER

Implement reliable background scheduling.

Do not rely on frontend browser timers.

Use a server-side job queue.

Recommended:

```text
Redis
+
BullMQ
```

or equivalent.

Jobs:

```text
Start Scheduled Stream
Stop Scheduled Stream
Send Webinar Reminder
Start Pre-recorded Broadcast
Process Recording
Generate Thumbnail
Generate Transcript
Generate AI Clips
Delete Expired Media
```

---

# 45. WEBINAR SYSTEM

Create a dedicated webinar product.

A webinar should have:

```text
Title
Description
Thumbnail
Date
Time
Timezone
Duration
Registration
Chat Enabled
Viewer Limit
On-demand Enabled
```

Source:

```text
Live Studio
or
Pre-recorded Video
```

---

# 46. WEBINAR REGISTRATION

Create customizable registration pages.

Default fields:

```text
First Name
Last Name
Email
```

Additional field types:

```text
Country
Phone
Text
Single Select
Checkbox
```

Features:

- Required fields.
- Drag/drop ordering.
- Custom labels.
- Validation.
- Terms checkbox.
- Export CSV.

---

# 47. WEBINAR EMAIL SYSTEM

Emails:

```text
Registration Confirmation
24 Hour Reminder
1 Hour Reminder
Broadcast Starting
Recording Available
```

Use configurable SMTP.

Example environment:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
```

---

# 48. WEBINAR WATCH PAGE

Create a public watch page.

Components:

```text
Video Player
Live Indicator
Viewer Count
Live Chat
Emoji Reactions
Title
Description
Host Branding
```

Responsive for:

- Desktop.
- Tablet.
- Mobile.

---

# 49. WEBINAR EMBEDDING

Provide embed code.

Example conceptual usage:

```html
<iframe
  src="https://studio.example.com/watch/WEBINAR_ID"
  width="100%"
  height="100%"
  frameborder="0"
  allow="autoplay; fullscreen">
</iframe>
```

Support:

- Domain restrictions.
- Allowed domains.
- Private embed tokens.

---

# 50. WEBINAR CHAT

Webinar viewers should:

- Enter display name if registration disabled.
- Chat.
- Send emoji reactions.

Host should:

- Pin message.
- Show message on stage.
- Disable chat.
- Delete/moderate messages.

---

# 51. GREEN ROOM

Create a private waiting area.

Participants enter:

```text
Invitation Link
       ↓
Device Test
       ↓
Green Room
       ↓
Producer Approval
       ↓
Backstage
       ↓
Stage
```

Green Room features:

- Private audio/video communication.
- Device check.
- Producer chat.
- Screen sharing test.
- Guest readiness indicator.

---

# 52. INVITATION SYSTEM

Generate secure guest URLs.

Example:

```text
https://studio.example.com/join/secure-token
```

Requirements:

- Random cryptographic token.
- Expiration option.
- Revocation.
- Single-use option.
- Password option.

---

# 53. REUSABLE STUDIOS

Users should be able to create reusable studios.

Saved configuration:

```text
Layout
Brand Assets
Background
Destinations
Guest Settings
Recording Settings
Resolution
Audio Settings
```

Future broadcasts can reuse the studio.

---

# 54. WORKSPACES

Data hierarchy:

```text
User
  ↓
Workspace
  ↓
Studio
  ↓
Broadcast
  ↓
Recording
```

Workspace owns:

```text
Members
Brand Assets
Destinations
Studios
Recordings
Webinars
Storage
```

---

# 55. TEAM COLLABORATION

Multiple producers can join the same studio.

Real-time synchronization must cover:

- Participant state.
- Stage state.
- Layout.
- Branding.
- Media playback.
- Comments.
- Broadcast state.

Use WebSocket or Socket.IO for application state synchronization.

Do not use WebRTC signaling as the only application state system.

---

# 56. PRESENCE SYSTEM

Display:

```text
Online
In Studio
In Green Room
Away
Offline
```

Use heartbeat.

---

# 57. STORAGE ARCHITECTURE

Do not permanently store large media files in the database.

Use:

```text
S3-compatible Object Storage
```

Recommended options:

```text
MinIO
S3
Cloudflare R2
```

For self-hosted deployment:

```text
MinIO
```

Recommended architecture:

```text
Application
     ↓
MinIO
     ↓
Videos
Recordings
Media
Thumbnails
Exports
```

---

# 58. DATABASE

Recommended:

```text
PostgreSQL
```

Do not use SQLite for production multi-user deployment.

Core tables:

```text
users
sessions
workspaces
workspace_members
studios
broadcasts
participants
destinations
destination_credentials
recordings
recording_tracks
media_assets
brand_folders
webinars
webinar_registrants
webinar_messages
scheduled_jobs
ai_clips
transcripts
transcript_segments
audit_logs
```

---

# 59. BACKEND ARCHITECTURE

Recommended stack:

```text
Node.js
TypeScript
NestJS or Fastify
PostgreSQL
Redis
Socket.IO
BullMQ
```

Alternative:

```text
Next.js API
+
Dedicated Worker Services
```

For this project, prefer separation:

```text
Frontend
API Server
WebSocket Server
Media Service
Worker Service
LiveKit
Redis
PostgreSQL
MinIO
```

---

# 60. FRONTEND

Recommended:

```text
Next.js
React
TypeScript
Tailwind CSS
```

UI requirements:

- Professional.
- Original.
- Dark mode first.
- Responsive dashboard.
- Desktop optimized studio.
- Mobile guest joining support.

Studio should prioritize desktop.

---

# 61. REAL-TIME STATE

Use a central state model.

Example:

```typescript
BroadcastState {
  broadcastId
  status
  participants[]
  stage[]
  layout
  activeMedia[]
  activeOverlays[]
  destinations[]
  recording
}
```

All producers receive state updates in real time.

---

# 62. MEDIA PROCESSING SERVICE

Create a dedicated worker/container for media processing.

Responsibilities:

```text
Transcoding
Thumbnails
Waveforms
Recording assembly
Video trimming
Audio extraction
Clip rendering
Caption burn-in
Export
```

Use:

```text
FFmpeg
```

---

# 63. FFmpeg SECURITY

Never directly interpolate user input into shell commands.

Use:

- Safe argument arrays.
- Strict validation.
- Job isolation.
- Resource limits.

---

# 64. AI SERVICE

AI functions:

```text
Transcription
Speaker Detection
Clip Selection
Title Generation
Caption Generation
Video Reframing
Background Generation
```

Architecture should allow:

```text
Local AI
or
External AI Provider
```

Configuration:

```env
AI_PROVIDER=local
AI_API_KEY=
```

---

# 65. AUTHENTICATION

Support:

- Email/password.
- Magic link optional.
- Google OAuth optional.
- SSO architecture optional.

Use:

- Secure cookies.
- Refresh token rotation.
- CSRF protection where appropriate.
- Rate limiting.

---

# 66. SECURITY

Implement:

- HTTPS.
- Secure cookies.
- JWT/session security.
- Encryption for destination credentials.
- AES-256-GCM or equivalent encryption-at-rest strategy.
- Environment based encryption keys.
- Rate limiting.
- Brute force protection.
- Invite token security.
- RBAC.
- Audit logs.

Never expose:

```text
Stream Keys
OAuth Refresh Tokens
SMTP Passwords
Encryption Keys
```

to the browser.

---

# 67. DESTINATION CREDENTIAL ENCRYPTION

Use an encryption service.

Concept:

```text
Plain Stream Key
       ↓
Encryption Service
       ↓
Encrypted Database Value
```

Decryption only inside backend process immediately before starting a stream.

---

# 68. AUDIT LOGGING

Log:

```text
Login
Failed Login
Destination Added
Destination Deleted
Broadcast Started
Broadcast Stopped
Recording Deleted
User Invited
Role Changed
Guest Removed
```

---

# 69. ANALYTICS

Per broadcast display:

```text
Start Time
End Time
Duration
Peak Viewer Count
Current Viewer Count
Destination Status
Recording Status
```

Where platform APIs allow, collect:

```text
Views
Likes
Comments
Watch Time
```

---

# 70. SYSTEM ADMINISTRATION

Create a server admin panel.

Display:

```text
CPU
RAM
Disk
Docker Health
PostgreSQL Health
Redis Health
MinIO Health
LiveKit Health
Active Broadcasts
Active Users
Storage Usage
Worker Queue
Failed Jobs
```

---

# 71. FEATURE FLAGS

Support feature flags.

Example:

```text
ENABLE_AI_CLIPS=true
ENABLE_WEBINARS=true
ENABLE_LOCAL_RECORDING=true
ENABLE_EXTRA_CAMERA=true
ENABLE_GUEST_DESTINATIONS=true
```

---

# 72. DOCKER DEPLOYMENT

All components must run with Docker Compose.

Suggested services:

```yaml
services:

  frontend:
    image/build: application frontend

  api:
    image/build: backend API

  websocket:
    image/build: realtime service

  worker:
    image/build: background worker

  postgres:
    image: postgres

  redis:
    image: redis

  minio:
    image: minio/minio

  livekit:
    image: livekit/livekit-server

  media:
    image/build: ffmpeg/media worker

  nginx:
    image: nginx
```

The stack must be importable into Portainer.

---

# 73. DOCKER REQUIREMENTS

Every service must include:

- Restart policy.
- Healthcheck.
- Persistent volumes.
- Environment variables.
- Internal Docker network.
- Minimal exposed ports.

Only reverse proxy ports should normally be publicly exposed.

---

# 74. PERSISTENT VOLUMES

Use named volumes:

```text
postgres_data
redis_data
minio_data
recordings_data
app_uploads
```

---

# 75. REVERSE PROXY

Support:

```text
Nginx Proxy Manager
or
Traefik
or
Caddy
```

Recommended initial deployment:

```text
Nginx Proxy Manager
```

Services should communicate internally over Docker networks.

---

# 76. HTTPS

The system must support:

```text
Let's Encrypt
Automatic Certificate Renewal
WebSocket Secure Connections
WebRTC Secure Connections
```

---

# 77. WEBRTC NETWORKING

Provide TURN server support.

Use:

```text
coturn
```

Architecture:

```text
Browser
 ├── STUN
 └── TURN
       ↓
LiveKit SFU
```

TURN is important for users behind:

- Corporate firewalls.
- Strict NAT.
- Symmetric NAT.

---

# 78. REQUIRED ENVIRONMENT VARIABLES

Create `.env.example`.

Example:

```env
APP_NAME=LiveStudio
APP_URL=https://studio.example.com

POSTGRES_DB=livestudio
POSTGRES_USER=livestudio
POSTGRES_PASSWORD=CHANGE_ME

DATABASE_URL=

REDIS_URL=

MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_ENDPOINT=
MINIO_BUCKET=

LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

TURN_DOMAIN=
TURN_USERNAME=
TURN_PASSWORD=

JWT_SECRET=
ENCRYPTION_KEY=

SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=

AI_PROVIDER=
AI_API_KEY=
```

No secret should be hard-coded.

---

# 79. API DESIGN

Use REST or typed API.

Example resources:

```text
/auth
/users
/workspaces
/studios
/broadcasts
/participants
/destinations
/media
/recordings
/webinars
/transcripts
/clips
/admin
```

---

# 80. WEBSOCKET EVENTS

Example:

```text
participant:joined
participant:left
participant:updated

stage:updated
layout:changed

broadcast:starting
broadcast:live
broadcast:ended

recording:started
recording:stopped

destination:connected
destination:failed

media:started
media:stopped

comment:received
comment:shown
```

---

# 81. BROADCAST STATE MACHINE

Implement strict state transitions.

```text
DRAFT
  ↓
SCHEDULED
  ↓
PREPARING
  ↓
READY
  ↓
LIVE
  ↓
ENDING
  ↓
ENDED
```

Failure:

```text
ANY STATE
   ↓
FAILED
```

Do not allow invalid transitions.

---

# 82. RECORDING PIPELINE

```text
Broadcast Ends
      ↓
Stop Egress
      ↓
Finalize Media
      ↓
Upload to Object Storage
      ↓
Generate Thumbnail
      ↓
Extract Audio
      ↓
Generate Transcript
      ↓
Generate AI Clips Optional
      ↓
Mark Recording Ready
```

---

# 83. JOB QUEUE

Use persistent background jobs.

Jobs must survive application restart.

Support:

```text
Queued
Processing
Completed
Failed
Retrying
```

---

# 84. ERROR HANDLING

Every major action should return user-friendly errors.

Example:

```text
Camera permission denied.

Unable to connect to streaming destination.

Recording processing failed.

Insufficient server storage.

Network connection unstable.

Guest connection lost. Attempting reconnection.
```

---

# 85. RECONNECTION

Participants must automatically reconnect.

When connection drops:

```text
Detect Connection Lost
      ↓
Retry WebRTC Connection
      ↓
Restore Participant
      ↓
Restore State
```

Do not require manual page reload whenever possible.

---

# 86. NETWORK QUALITY

Show:

```text
Excellent
Good
Fair
Poor
Disconnected
```

Use:

- RTT.
- Packet loss.
- Jitter.
- Available bitrate.

---

# 87. STORAGE MANAGEMENT

Admin can configure:

```text
Maximum Workspace Storage
Maximum Recording Size
Automatic Deletion
Retention Days
```

Example:

```text
DELETE_RECORDINGS_AFTER_DAYS=0
```

`0` means never automatically delete.

---

# 88. BACKUP

Document backup strategy.

Backup:

```text
PostgreSQL
Configuration
MinIO Data
Environment Secrets
```

Recommended automated backup:

```text
Daily PostgreSQL Dump
+
Object Storage Backup
```

---

# 89. MONITORING

Add:

- Container health.
- Application logs.
- Error logs.
- Worker failures.
- Stream failures.

Recommended future integrations:

```text
Prometheus
Grafana
Loki
Sentry
```

---

# 90. MINIMUM MVP

Phase 1 must implement:

1. Authentication.
2. Workspace.
3. Studio.
4. Guest invitation.
5. WebRTC video.
6. Participant management.
7. Stage layouts.
8. Screen share.
9. Branding.
10. Recording.
11. Custom RTMP streaming.
12. Multistreaming.
13. Media library.
14. Recording downloads.
15. Docker deployment.

---

# 91. PHASE 2

Implement:

1. Webinar.
2. Registration.
3. Email reminders.
4. Webinar embedding.
5. Green Room.
6. Pre-recorded streams.
7. Live chat aggregation.
8. Guest destinations.
9. Local recording.
10. Transcription.

---

# 92. PHASE 3

Implement:

1. AI clips.
2. Auto captions.
3. Smart reframing.
4. AI backgrounds.
5. Advanced analytics.
6. SSO.
7. Enterprise workspaces.
8. Advanced monitoring.
9. Horizontal scaling.

---

# 93. DEVELOPMENT REQUIREMENTS

The AI developer must:

1. Create production-quality TypeScript.
2. Avoid placeholder implementations for core functionality.
3. Avoid fake buttons.
4. Every UI action must connect to backend logic.
5. Use database migrations.
6. Provide API validation.
7. Provide error handling.
8. Provide Docker configuration.
9. Provide `.env.example`.
10. Provide README.
11. Provide Portainer deployment instructions.
12. Provide backup instructions.

---

# 94. TESTING REQUIREMENTS

Include:

```text
Unit Tests
API Tests
Integration Tests
End-to-End Tests
```

Critical tests:

- Authentication.
- Guest joining.
- Broadcast state transitions.
- Recording start/stop.
- Destination encryption.
- Stream retry.
- Scheduled stream execution.
- Permission checks.

---

# 95. UI DESIGN REQUIREMENTS

Design must be original.

Do not copy:

- StreamYard logo.
- StreamYard name.
- StreamYard colors.
- StreamYard icons.
- StreamYard exact layout.
- StreamYard proprietary graphics.

Create an independent professional design.

Suggested design:

```text
Dark Studio Interface
Modern Sidebar
Large Program Preview
Modular Control Panels
Keyboard Shortcuts
```

---

# 96. KEYBOARD SHORTCUTS

Implement configurable shortcuts.

Example:

```text
Space = Toggle Mic
V = Toggle Camera
R = Start/Stop Recording
L = Go Live
1-9 = Layout Presets
```

---

# 97. PERFORMANCE REQUIREMENTS

Target:

- Studio UI remains responsive.
- No unnecessary rerenders.
- Lazy load media.
- Use CDN/object storage URLs where appropriate.
- Background jobs for CPU-intensive work.
- Do not transcode inside API request lifecycle.

---

# 98. SCALABILITY

The architecture should support future scaling.

```text
Load Balancer
      │
      ├── API Instance 1
      ├── API Instance 2
      └── API Instance N

Shared:
PostgreSQL
Redis
Object Storage
LiveKit Cluster
Workers
```

---

# 99. IMPORTANT IMPLEMENTATION PRIORITY

Do not attempt to build every feature simultaneously.

Development order:

```text
STEP 1
Authentication + Database + Docker

STEP 2
Workspaces + Dashboard

STEP 3
WebRTC Studio

STEP 4
Stage + Layout Engine

STEP 5
Recording

STEP 6
RTMP Streaming

STEP 7
Multistreaming

STEP 8
Media Library

STEP 9
Webinars

STEP 10
Pre-recorded Streaming

STEP 11
Local Recording

STEP 12
AI Features
```

Each phase must be fully tested before starting the next.

---

# 100. FINAL DELIVERABLES

The completed project must include:

```text
Production Source Code
Dockerfiles
docker-compose.yml
Portainer Stack Configuration
.env.example
Database Migrations
README.md
Architecture Documentation
API Documentation
Deployment Guide
Backup Guide
Update Guide
Troubleshooting Guide
```

---

# 101. PORTAINER DEPLOYMENT REQUIREMENT

The final project must be deployable using:

```text
Portainer
 → Stacks
 → Add Stack
 → Paste docker-compose.yml
 → Add Environment Variables
 → Deploy Stack
```

Persistent volumes must survive container recreation.

---

# 102. ACCEPTANCE CRITERIA

The project is considered complete when a user can:

1. Open the self-hosted website.
2. Register/login.
3. Create workspace.
4. Create live studio.
5. Invite guest.
6. Guest joins using browser.
7. Host controls stage.
8. Host adds branding.
9. Host shares screen.
10. Host records broadcast.
11. Host streams to multiple RTMP destinations.
12. Recording appears in library.
13. Recording can be downloaded.
14. Webinar can be created.
15. Viewer can register.
16. Webinar can be watched.
17. Webinar can be embedded.
18. Application can be deployed through Portainer.
19. All persistent data survives Docker restart.
20. No StreamYard branding or proprietary assets are copied.

---

# FINAL INSTRUCTION TO THE AI DEVELOPER

Build this as a real production application, not a frontend mockup.

Do not:

- Create fake UI functionality.
- Simulate live streaming.
- Return placeholder recording URLs.
- Use hard-coded demo data in production flows.
- Hard-code secrets.
- Put media processing inside HTTP request handlers.
- Use SQLite as the production database.
- Couple all services into one unscalable container.

The implementation must prioritize:

```text
Reliability
Security
Recoverability
Docker Deployment
Media Quality
Real-time Synchronization
Scalability
Maintainability
```

Start by generating the complete repository architecture and Docker Compose infrastructure before implementing the frontend.