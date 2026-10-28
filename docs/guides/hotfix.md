# Release y hotfix

Cómo llega un cambio a producción, por el camino normal y por el de urgencia. El push a `main` es
lo que despliega (`deploy.yml`); `dev` es la rama de integración y todo release sale con
`commit-and-tag-version`.

---

## 1. El camino normal

```
config ──PR──▶ dev ──release──▶ PR dev → main (merge commit) ──▶ deploy
```

1. El trabajo se hace en `config` y entra a `dev` por PR.
2. En `dev`: `npx commit-and-tag-version` crea `chore(release): X.Y.Z`, el tag y la entrada del
   `CHANGELOG.md`. Luego `git push --follow-tags origin dev`.
3. PR `dev → main`, mergeado con **merge commit**.
4. Mirar el run de `deploy.yml`: que los jobs **"Deploy <app>"** se hayan ejecutado, no solo que el
   run esté verde. Si se saltaron, `gh workflow run deploy.yml --ref main -f apps=all`.

---

## 2. ¿Hace falta un hotfix?

Un hotfix existe para una sola situación: **producción tiene un error urgente y `dev` lleva cambios
que todavía no deben salir**.

| Situación                                         | Camino                                |
| ------------------------------------------------- | ------------------------------------- |
| Todo lo que está en `dev` puede salir             | El normal, rápido (fix → dev → patch) |
| `dev` tiene cosas a medias o sin probar           | Hotfix desde `main` (sección 3)       |
| El arreglo toma más de un día o toca varias cosas | El normal: ya no es un hotfix         |

---

## 3. El flujo de hotfix

```
main ──▶ hotfix/<tema> ──fix + patch──▶ PR → main ──▶ deploy
                                                │
                                                └──PR main → dev  (no saltarlo)
```

### 3.1 Rama desde lo que está en producción

```bash
git fetch origin
git checkout -b hotfix/<tema> origin/main
```

`<tema>` en kebab-case y corto: `hotfix/mensaje-borrado`, `hotfix/total-factura`.

### 3.2 El fix

Un solo problema, commits `fix:` (Conventional Commits, igual que siempre). Nada de features ni
refactors colados, aunque sean chicos: lo que entra acá sale a producción sin pasar por `dev`.

Antes de seguir, lo mismo que en cualquier cambio: `nx lint` y `nx build` de las apps afectadas.

### 3.3 Release patch en la misma rama

```bash
npx commit-and-tag-version --release-as patch   # p. ej. 0.1.11 → 0.1.12
git push --follow-tags origin hotfix/<tema>
```

Siempre **patch**, nunca `minor`. El tag y la entrada del changelog llevan solo el fix.

### 3.4 PR a `main`

PR `hotfix/<tema> → main`, mergeado con **merge commit** (el commit del tag tiene que quedar
alcanzable desde `main`). En el PR corren CI y commitlint igual que en `dev → main`.

Al mergear se despliega: revisar los jobs "Deploy <app>" como en el paso 4 de la sección 1.

### 3.5 Devolver el hotfix a `dev` — no saltarlo

PR `main → dev` (merge commit). Si no se hace:

- `dev` no tiene el fix, y el próximo `dev → main` puede deshacerlo o chocar en conflicto.
- `commit-and-tag-version` en `dev` no ve el tag del hotfix y vuelve a calcular **la misma
  versión**: tag duplicado y un changelog que repite entradas.

Con el PR hecho, el próximo release de `dev` sigue con la versión siguiente y su changelog arranca
desde el tag del hotfix.

Después, traer `dev` a `config` como siempre para seguir trabajando sobre la base actual.

---

## 4. Resumen

| Paso              | Comando / acción                                                  |
| ----------------- | ----------------------------------------------------------------- |
| Rama              | `git checkout -b hotfix/<tema> origin/main`                       |
| Fix               | commits `fix:`, lint y build                                      |
| Release           | `npx commit-and-tag-version --release-as patch` + `--follow-tags` |
| Producción        | PR `hotfix/<tema> → main`, merge commit, revisar el deploy        |
| Volver a integrar | PR `main → dev`, merge commit                                     |
| Seguir trabajando | `dev` → `config`                                                  |
