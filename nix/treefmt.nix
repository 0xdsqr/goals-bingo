{
  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.biome = {
    enable = true;
    settings = {
      files = {
        ignore = [
          "**/routeTree.gen.ts"
          "**/_generated/**"
          "**/*.css"
        ];
      };
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
      linter = {
        rules = {
          suspicious = {
            noExplicitAny = "off";
          };
          a11y = {
            useSemanticElements = "warn";
          };
        };
      };
    };
  };
}
