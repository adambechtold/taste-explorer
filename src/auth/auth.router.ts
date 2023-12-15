import express, { Request, Response } from "express";
import querystring from "querystring";
import { generateRandomString } from "../utils/string.utils";
import { storeSpotifyAccessToken } from "./auth.utils";

export const authRouter = express.Router();

type SpotifyAccessTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
};

const clientId = process.env.SPOTIFY_CLIENT_ID;
if (!clientId) {
  throw new Error("Missing SPOTIFY_CLIENT_ID");
}
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientSecret) {
  throw new Error("Missing SPOTIFY_CLIENT_SECRET");
}

const callbackEndpoint = "/login/spotify/callback";
const redirectUri = "http://localhost:4000/auth" + callbackEndpoint;

authRouter.get("/login/spotify", (req: Request, res: Response) => {
  const state = generateRandomString(16);
  const scope = "user-read-private user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      })
  );
});

authRouter.get(callbackEndpoint, async (req: Request, res: Response) => {
  const code = (req.query.code as string) || null;
  const state = req.query.state || null;

  if (state === null) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  }

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    json: true,
  };

  const authTokenResponse = await fetch(authOptions.url, {
    method: "POST",
    headers: authOptions.headers,
    body: querystring.stringify(authOptions.form),
  });

  const authTokenJson =
    (await authTokenResponse.json()) as SpotifyAccessTokenResponse;

  const accessToken = await storeSpotifyAccessToken(
    { id: 1 },
    authTokenJson.access_token,
    authTokenJson.refresh_token,
    new Date(Date.now() + authTokenJson.expires_in * 1000)
  );

  res.send("got it");
});
