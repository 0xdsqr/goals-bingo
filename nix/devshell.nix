{ nixpkgs, system }:
let
  pkgs = import nixpkgs { inherit system; };
in
{
  # import the dev pkgs from compilation
  packages.${system}.default = [
    pkgs.bun
  ];

  # Create a development shell
  devShells.${system}.default = pkgs.mkShell {
    buildInputs = with pkgs; [
      curl
      wget
      just
      nixfmt-rfc-style
      nixfmt-tree
      statix
      deadnix
      nil
      bun
      starship
    ];

    shellHook = ''
      if [[ -n "$ZSH_VERSION" ]]; then
        eval "$(starship init zsh)"
      else
        eval "$(starship init bash)"
      fi

      echo "Bun version: $(bun --version)"
      echo "🚀 Development shell activated, you can now compile things"

      scaffold() {
        bun run scaffold "$@"
      }
    '';

    # Prefer zsh as the shell
    preferLocalBuild = true;
    shell = "${pkgs.zsh}/bin/zsh";
  };
}