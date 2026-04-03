import { OAuthUrlParams, OAuthTokenExchangeResult } from '../types';
import { OAuthError } from '../errors';

const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const META_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';

/**
 * Scopes needed for Facebook Pages + Instagram publishing.
 *
 * Facebook Page posting:
 *   pages_show_list, pages_read_engagement, pages_manage_posts
 *
 * Instagram Business publishing:
 *   instagram_basic, instagram_content_publish, pages_show_list,
 *   pages_read_engagement
 *
 * These require Facebook App Review for production use.
 * In development, add test users to the app to bypass review.
 */
export const META_FACEBOOK_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
];

export const META_INSTAGRAM_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
];

export const META_ALL_SCOPES = Array.from(
  new Set([...META_FACEBOOK_SCOPES, ...META_INSTAGRAM_SCOPES]),
);

export class MetaOAuthHelper {
  /**
   * Build the authorization URL to redirect the user to Meta OAuth.
   *
   * Setup:
   * 1. Create a Meta App at https://developers.facebook.com/apps
   * 2. Add "Facebook Login" product
   * 3. Set Valid OAuth Redirect URIs
   * 4. Set META_APP_ID and META_APP_SECRET in .env
   */
  static buildAuthUrl(params: OAuthUrlParams): string {
    const url = new URL(META_AUTH_URL);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    url.searchParams.set('scope', params.scopes.join(','));
    url.searchParams.set('response_type', 'code');
    return url.toString();
  }

  /**
   * Exchange the OAuth code for a short-lived user access token,
   * then exchange that for a long-lived token (60 days).
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<OAuthTokenExchangeResult> {
    // Step 1: short-lived token
    const shortUrl = new URL(META_TOKEN_URL);
    shortUrl.searchParams.set('client_id', clientId);
    shortUrl.searchParams.set('client_secret', clientSecret);
    shortUrl.searchParams.set('redirect_uri', redirectUri);
    shortUrl.searchParams.set('code', code);

    const shortRes = await fetch(shortUrl.toString());
    if (!shortRes.ok) {
      const body = await shortRes.text();
      throw new OAuthError('FACEBOOK', `Token exchange failed: ${body}`);
    }
    const short = (await shortRes.json()) as { access_token: string; token_type: string };

    // Step 2: exchange for long-lived token
    const longUrl = new URL(META_TOKEN_URL);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', clientId);
    longUrl.searchParams.set('client_secret', clientSecret);
    longUrl.searchParams.set('fb_exchange_token', short.access_token);

    const longRes = await fetch(longUrl.toString());
    if (!longRes.ok) {
      const body = await longRes.text();
      throw new OAuthError('FACEBOOK', `Long-lived token exchange failed: ${body}`);
    }
    const long = (await longRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    return {
      accessToken: long.access_token,
      expiresIn: long.expires_in,
      tokenType: long.token_type,
    };
  }

  /**
   * Fetch all pages the user manages (each page has its own permanent page token).
   */
  static async getUserPages(userAccessToken: string): Promise<
    Array<{ id: string; name: string; access_token: string; category?: string }>
  > {
    const url = new URL('https://graph.facebook.com/v19.0/me/accounts');
    url.searchParams.set('fields', 'id,name,access_token,category,picture');
    url.searchParams.set('access_token', userAccessToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new OAuthError('FACEBOOK', 'Failed to fetch user pages');
    const body = (await res.json()) as { data: Array<{ id: string; name: string; access_token: string; category?: string }> };
    return body.data;
  }

  /**
   * Get the Instagram Business account linked to a Facebook Page.
   */
  static async getLinkedInstagramAccount(
    pageId: string,
    pageAccessToken: string,
  ): Promise<{ id: string; name: string; username: string } | null> {
    const url = new URL(`https://graph.facebook.com/v19.0/${pageId}`);
    url.searchParams.set('fields', 'instagram_business_account{id,name,username,profile_picture_url}');
    url.searchParams.set('access_token', pageAccessToken);

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const body = (await res.json()) as {
      instagram_business_account?: { id: string; name: string; username: string };
    };
    return body.instagram_business_account ?? null;
  }
}
