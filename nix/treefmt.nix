{
  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.biome = {
    enable = true;
    includes = [
      "*.ts"
      "*.tsx"
      "*.js"
      "*.jsx"
      "*.json"
    ];
    excludes = [
      "**/routeTree.gen.ts"
      "**/_generated/**"
      "**/*.css"
      "**/node_modules/**"
    ];
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
      linter = {
        rules = {
          suspicious = {
            noExplicitAny = "off";
          };
          a11y = {
            useSemanticElements = "off";
            noStaticElementInteractions = "off";
            useKeyWithClickEvents = "off";
            noAutofocus = "off";
          };
        };
      };
    };
  };
}
