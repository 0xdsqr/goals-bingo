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

      # Load .env files if they exist
      if [[ -f apps/bingo/.env ]]; then
        set -a
        source apps/bingo/.env
        set +a
      fi
      if [[ -f apps/bingo/.env.local ]]; then
        set -a
        source apps/bingo/.env.local
        set +a
      fi

      echo "Bun version: $(bun --version)"
      echo "🚀 Development shell activated"
      echo ""
      echo "Commands:"
      echo "  dev        - Start UI + Convex backend"
      echo "  dev:ui     - Start UI only"
      echo "  dev:convex - Start Convex only"

      dev() {
        echo "Starting Convex and UI..."
        bun run --filter @goals-bingo/bingo dev:convex &
        CONVEX_PID=$!
        sleep 2
        bun run --filter @goals-bingo/bingo dev
        kill $CONVEX_PID 2>/dev/null
      }

      dev:ui() {
        bun run --filter @goals-bingo/bingo dev
      }

      dev:convex() {
        bun run --filter @goals-bingo/bingo dev:convex
      }
    '';

    # Prefer zsh as the shell
    preferLocalBuild = true;
    shell = "${pkgs.zsh}/bin/zsh";
  };
}
