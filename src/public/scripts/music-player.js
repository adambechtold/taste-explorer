let duration = 10000;
let position = 0;
let isPlaying = false;

let thisDeviceId = null;
let isPlayingOnThisDevice = false;

setInterval(() => {
  if (isPlaying) {
    position += 1000;
    updateProgress(position, duration);
  }
}, 1000);

window.onSpotifyWebPlaybackSDKReady = () => {
  getLatestAccessToken().then((token) => {
    initializeSpotifyPlayer(token);
  });
};

function initializeSpotifyPlayer(token) {
  const player = new Spotify.Player({
    name: "Web Playback for Taste Explorer",
    getOAuthToken: (cb) => {
      cb(token);
    },
  });

  // Not Ready
  player.addListener("not_ready", ({ device_id }) => {
    console.log("Device ID has gone offline", device_id);
  });

  // Errors
  player.addListener("initialization_error", ({ message }) => {
    console.error("Initialization Error:", message);
  });

  player.addListener("authentication_error", ({ message }) => {
    console.error("Authentication Error:", message);
  });

  player.addListener("account_error", ({ message }) => {
    console.error("Account Error:", message);
  });

  player.addListener("playback_error", ({ message }) => {
    console.error("Playback Error:", message);
  });

  player.addListener("autoplay_failed", ({ message }) => {
    console.error("Autoplay Error:", message);
  });

  // Ready
  player.addListener("ready", ({ device_id }) => {
    thisDeviceId = device_id;
    document.getElementById(
      "music-player-transfer-playback-container"
    ).onclick = () => {
      player.activateElement();

      try {
        setDisplayOfTransferPlaybackDialog(false);
        setDisplayOfMusicPlayer(true);
        transferPlayStateToDevice(thisDeviceId).then(() => {
          isPlayingOnThisDevice = true;
          connectPlayerToUI(player);
        });
      } catch (error) {
        setDisplayOfTransferPlaybackDialog(true);
        setDisplayOfMusicPlayer(false);
        console.error(error);
      }
    };
  });

  // Watch Player State
  player.addListener("player_state_changed", (state) => {
    if (!state) {
      isPlayingOnThisDevice = false;
      setDisplayOfTransferPlaybackDialog(true);
      setDisplayOfMusicPlayer(false);
      return;
    }

    if (state.paused) {
      isPlaying = false;
      document.getElementById("toggle-play-pause").innerHTML = "▶︎";
    } else {
      isPlaying = true;
      document.getElementById("toggle-play-pause").innerHTML = "⏸︎";
    }

    // Update Track Progress
    updateProgress(state.position, state.duration);

    // Update Track Information
    if (state.track_window.current_track) {
      const trackAlbumImage = document.getElementById(
        "music-player-track-image"
      );
      const trackName = document.getElementById("music-player-track-name");
      const trackArtist = document.getElementById("music-player-track-artist");
      const trackInPlaylist = document.getElementById(
        `track-spotify-${state.track_window.current_track.id}`
      );

      trackAlbumImage.src =
        state.track_window.current_track.album.images[0].url;
      trackName.innerHTML = state.track_window.current_track.name;
      trackArtist.innerHTML = state.track_window.current_track.artists
        .map((artist) => artist.name)
        .join(", ");

      if (trackInPlaylist) {
        const previousTrack = document.getElementsByClassName("track-playing");
        if (previousTrack.length > 0) {
          previousTrack[0].classList.remove("track-playing");
        }
        trackInPlaylist.classList.add("track-playing");
      }
    }
  });

  player.connect();
}

function connectPlayerToUI(player) {
  document.getElementById("toggle-play-pause").onclick = () => {
    player.togglePlay();
  };

  document.getElementById("next-track").onclick = () => {
    player.nextTrack();
  };

  document.getElementById("previous-track").onclick = () => {
    player.previousTrack();
  };
}

function updateProgress(newPosition, newDuration) {
  position = newPosition;
  duration = newDuration;
  const progressBar = document.getElementById("track-progress-bar");
  progressBar.max = duration;
  progressBar.value = position;

  const progressText = document.getElementById("track-progress-text");
  const durationText = document.getElementById("track-duration-text");
  const progress = secondsToTimeFormat(position / 1000);
  const total = secondsToTimeFormat(duration / 1000);
  progressText.innerHTML = progress;
  durationText.innerHTML = total;
}

async function transferPlayStateToDevice(deviceId) {
  return fetch("/api/music/transfer-playback", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceId }),
  });
}

async function getLatestAccessToken() {
  const response = await fetch("/auth/spotify/token");
  const { token } = await response.json();
  return token;
}

function setDisplayOfTransferPlaybackDialog(isVisible) {
  if (isVisible) {
    document
      .getElementById("music-player-transfer-playback-container")
      .style.removeProperty("display");
  } else {
    document.getElementById(
      "music-player-transfer-playback-container"
    ).style.display = "none";
  }
}

function setDisplayOfMusicPlayer(isVisible) {
  if (!document.getElementById("music-player-container")) {
    return;
  }
  if (isVisible) {
    document
      .getElementById("music-player-container")
      .style.removeProperty("display");
  } else {
    document.getElementById("music-player-container").style.display = "none";
  }
}

/** WebPlaybackState Object
 * https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybacktrack-object
{
  context: {
    uri: 'spotify:album:xxx', // The URI of the context (can be null)
    metadata: {},             // Additional metadata for the context (can be null)
  },
  disallows: {                // A simplified set of restriction controls for
    pausing: false,           // The current track. By default, these fields
    peeking_next: false,      // will either be set to false or undefined, which
    peeking_prev: false,      // indicates that the particular operation is
    resuming: false,          // allowed. When the field is set to `true`, this
    seeking: false,           // means that the operation is not permitted. For
    skipping_next: false,     // example, `skipping_next`, `skipping_prev` and
    skipping_prev: false      // `seeking` will be set to `true` when playing an
                              // ad track.
  },
  paused: false,  // Whether the current track is paused.
  position: 0,    // The position_ms of the current track.
  repeat_mode: 0, // The repeat mode. No repeat mode is 0,
                  // repeat context is 1 and repeat track is 2.
  shuffle: false, // True if shuffled, false otherwise.
  track_window: {
    current_track: <WebPlaybackTrack>,                              // The track currently on local playback
    previous_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...], // Previously played tracks. Number can vary.
    next_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...]      // Tracks queued next. Number can vary.
  }
}
 */
