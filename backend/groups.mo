// Group helpers - validation
// State lives in main.mo

import Text "mo:base/Text";
import Types "types";

module {
  public type SocialLink = Types.SocialLink;

  public func validateGroup(name : Text, email : Text) : ?Text {
    if (name == "") { return ?"Name required" };
    if (email == "") { return ?"Email required" };
    null
  };

  /// Normalize optional website: empty text clears to null; trim not applied (caller may trim).
  public func normalizeOptionalWebsite(t : Text) : ?Text {
    if (t == "") { null } else { ?t }
  };

  public func validateOptionalWebsite(t : Text) : ?Text {
    if (t == "") { return null };
    if (not (Text.startsWith(t, #text "https://") or Text.startsWith(t, #text "http://"))) {
      return ?"Website must start with http:// or https://"
    };
    null
  };

  public func validateSocialLinks(links : [SocialLink]) : ?Text {
    for (link in links.vals()) {
      if (link.platform == "") { return ?"Social platform name required" };
      if (link.url == "") { return ?"Social URL required" };
      if (not (Text.startsWith(link.url, #text "https://") or Text.startsWith(link.url, #text "http://"))) {
        return ?"Social URL must start with http:// or https://"
      }
    };
    null
  };

  public func normalizeOptionalPicturePath(t : Text) : ?Text {
    if (t == "") { null } else { ?t }
  };
};
