{
  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.biome = {
    enable = true;
    settings = {
      formatter = {
        indentStyle = "space";
        indentWidth = 2;
      };
      javascript = {
        formatter = {
          quoteStyle = "double";
          semicolons = "asNeeded";
        };
      };
    };
  };
}
