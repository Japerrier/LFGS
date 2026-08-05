// CloudFront Function — viewer request
//
// Two jobs:
//
// 1. Redirect www.lfgs.gg -> lfgs.gg. Both hostnames point at this same
//    distribution (both covered by the ACM cert), but we only want one
//    canonical URL indexed/shared, so www requests get a 301 to the apex.
//
// 2. Astro's static build writes each route as directory/index.html (e.g. the
//    page at /tournament/schedule lives on disk at tournament/schedule/index.html).
//    S3 (behind Origin Access Control) only resolves an index document at the
//    bucket root, not per-directory, so a request for the clean URL
//    "/tournament/schedule" would otherwise 403/404. This rewrites the request
//    URI before it hits S3 so clean URLs resolve to the right file, without
//    exposing .html anywhere.
//
// Deploy: create a CloudFront Function in the console/CLI/IaC with this source,
// then associate it with the distribution's default (and any other relevant)
// cache behavior on the "Viewer Request" event. This file isn't wired into the
// GitHub Actions deploy pipeline — it only needs to be (re)published when this
// source changes, which should be rare.
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;

  if (host === 'www.lfgs.gg') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://lfgs.gg' + request.uri + (request.querystring ? '?' + Object.keys(request.querystring).map(function (k) {
          return k + '=' + request.querystring[k].value;
        }).join('&') : '') },
      },
    };
  }

  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
