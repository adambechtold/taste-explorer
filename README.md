# Taste Explorer

**Compare your music preferences to your friends** starting with the ability to create playlists that with just your music, just your friend's music, or music you've both loved.

Test

## [Try it Now](https://music.adambechtold.xyz)

You'll just need...

- [ ] ...a [last.fm](https://www.last.fm) account
- [ ] ...a [spotify](https://spotify.com) account

![screenshot](./documentation/assets/taste-comparison.screenshot.png)

# Development

## Requirements

- [Node.js](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
- [Docker](https://www.docker.com/blog/getting-started-with-docker-desktop/)
- [Spotify Development App](https://developer.spotify.com/)
- [last.fm API Key](https://www.last.fm/api)

### 1 | Install Dependencies

```sh
npm install
```

### 2 | Configure Environment Variables

Create a `.env` file in the root directory.

```sh
cp .env.example .env
```

Update...

- [ ] Spotify Client Id - `SPOTIFY_CLIENT_ID`
- [ ] Spotify Client Password - `SPOTIFY_CLIENT_SECRET`
- [ ] Last.fm API Key - `LASTFM_API_KEY`
- [ ] Last.fm Shared Secret - `LASTFM_SHARED_SECRET`
- [ ] Session Secret - `SESSION_SECRET`
- [ ] Admin API Secret - `API_SECRET`

Update the `DATABASE_URL` if you want to connect to a remote database. The `DATABASE_URL` included in `.env.example` is configured to use the Dockerized database included in the `docker-compose.yml` file.

- [Resource | last.fm | Create API Account](https://developer.spotify.com/documentation/web-api/tutorials/getting-started)
  - Consideration | last.fm api accounts are very easy to get. Just fill out a quick form.
- [Resource | Spotify | Getting started with the Web API](https://developer.spotify.com/documentation/web-api/tutorials/getting-started)

### 3 | Apply Database Schema

```sh
npx prisma migrate dev # This will apply to the database specified in the DATABASE_URL of your .env
```

### 4 | Optional | Seed Database

You can download a sample data set of 4 listeners here: [music.adambechtold.xyz/api/setup/seed.zip](https://music.adambechtold.xyz/api/setup/seed.zip)

It contains a series of `.dump` files which you can load into your database using the method of your choice. If you're having trouble with this, comment on this [issue](https://github.com/adambechtold/taste-explorer/issues/23).

### 5 | Run Web Server

```sh
# If you have your own database running and modified DATABASE_URL in step 2
npm run dev

# If you want to use the pre-configured Dockerized database for local development
npm run dev:local
```

### 6 | Optional | Run Cron Jobs to Start Collecting New Data

Start the cron jobs that track listening history and research additional information about tracks.

```sh
npx ts-node src/music/cron/scheduleJobs.cron.ts \
              updateListeningHistory \
              createListens \
              addTrackFeatures
```

Consider running these in separate `screen` instances.

### 7 | Optional | Check out the Admin API

- 📝 Documentation - [Admin API](music.adambechtold.xyz/admin/api-docs/)

## Testing

### Set Up Tests

1. Create a `.env.test.local` file

```sh
cp .env.example .env.test.local
```

2. Configure the `DATABASE_URL` to connect to the test database hosted by Docker

```bash
# Filename: .env.test.local
...
DATABASE_URL='mysql://root:test@localhost:3306/test'
...
```

### Run Tests

```sh
npm run test
```

The Dockerized database for tests will start running and tests will be executed.

# Grafana Dashboard

## 1 | Create Granfana User in DB

```sql
CREATE USER 'grafana'@'%' IDENTIFIED BY 'grafana';
GRANT SELECT ON taste_explorer.* TO 'grafana'@'%';
```

## 2 | Start Grafana

```sh
cd dashboard && docker compose up
```

## 3 | Access Grafana

- [http://localhost:5001](http://localhost:5001)

Your starting login information is:

- Username: `admin`
- Password: `admin`

## 4 | Add Data Source

Head to `Home` > `Connections` > `Data Sources` > `Add Data Source`

## 5 | TODO: Import Dashboard Configuration

Adam will update this after some initial work on the dashboard.

# FAQ

## Why aren't styles loading?

Sometimes, the browser doesn't allow non-SSL-protected resources to load, even from localhost.

The fastest way to get around this is to simply forward traffic through a service like VS Code port forwarding. ngrok is another common service for this.

(If you know a better way around this, let me know!)

![load-stylesheets](./documentation/assets/load-stylesheets-with-port-forwarding.png)
