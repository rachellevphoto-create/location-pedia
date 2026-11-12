.PHONY: help install dev build start \
       prisma-generate prisma-migrate prisma-deploy prisma-studio db-seed db-postgis \
       lint typecheck check clean

# ──────────────────────────────────────────────
#  LocatePedia – development helper targets
# ──────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Setup ────────────────────────────────────

install: ## Install npm dependencies
	npm install

setup: install prisma-migrate db-seed ## Full first-time setup (install, migrate, seed)
	@echo ""
	@echo "✔  Setup complete. Run 'make dev' to start developing."

# ── Application ──────────────────────────────

dev: ## Start Next.js dev server (frontend + backend)
	npm run dev

build: ## Build the production bundle
	npm run build

start: ## Start the production server (run 'make build' first)
	npm run start

# ── Prisma / Database ────────────────────────

prisma-generate: ## Generate Prisma client
	npx prisma generate

prisma-migrate: ## Run Prisma migrations (dev)
	npx prisma migrate dev

prisma-deploy: ## Apply migrations (production)
	npx prisma migrate deploy

prisma-studio: ## Open Prisma Studio GUI
	npm run prisma:studio

db-seed: ## Seed the database
	npm run db:seed

db-postgis: ## Apply PostGIS spatial indexes
	npm run db:postgis

# ── Quality ──────────────────────────────────

lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript type-checking
	npm run typecheck

check: lint typecheck ## Run lint + typecheck

# ── Housekeeping ─────────────────────────────

clean: ## Remove build artifacts and generated files
	rm -rf .next node_modules/.cache

nuke: clean ## Full clean: build artifacts + node_modules (re-run 'make install')
	rm -rf node_modules
