// CloudFront Function — viewer request, attached to the "/media/*" cache
// behavior only.
//
// The path pattern "/media/*" only controls which origin CloudFront routes
// to — it doesn't remove that prefix from the request forwarded to the
// origin. The media S3 bucket stores objects without a "media/" prefix
// (e.g. "season-8/teams/.../logo.JPG"), so without this rewrite every
// request would ask S3 for a key that doesn't exist and get back a 403
// (OAC-signed requests can't see the difference between "denied" and
// "doesn't exist", so a missing key looks identical to no permission).
//
// Deploy: create a CloudFront Function in the console/CLI/IaC with this
// source, then associate it with the "/media/*" cache behavior's "Viewer
// Request" event (not the default "*" behavior, which uses url-rewrite.js
// instead).
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\/media/, '');
  return request;
}
