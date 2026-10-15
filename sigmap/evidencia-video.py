import os
from playwright.sync_api import sync_playwright

OUT_VIDEO_DIR = "/home/claude/evidencias/video"
OUT_SHOTS = "/home/claude/evidencias/capturas-puesta-en-marcha"
os.makedirs(OUT_VIDEO_DIR, exist_ok=True)
os.makedirs(OUT_SHOTS, exist_ok=True)
BASE = "http://localhost:4000/"


def click_texto(page, selector, texto):
    page.evaluate(
        """([sel, txt]) => {
            const b = [...document.querySelectorAll(sel)].find(e => e.textContent.includes(txt));
            if (!b) throw new Error('no encontrado: ' + txt);
            b.click();
        }""", [selector, texto])


def click_fila(page, codigo, boton_txt=None):
    page.evaluate(
        """([cod, btn]) => {
            const fila = [...document.querySelectorAll('tbody tr')].find(f => f.textContent.includes(cod));
            if (!fila) throw new Error('fila no encontrada: ' + cod);
            const bs = [...fila.querySelectorAll('button')];
            const b = btn ? bs.find(x => x.textContent.includes(btn)) : bs[0];
            b.click();
        }""", [codigo, boton_txt])


ROTULO_JS = """(t) => {
  let b = document.getElementById('rotulo-demo');
  if (!b) {
    b = document.createElement('div'); b.id = 'rotulo-demo';
    b.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1f3864;color:#fff;font:600 21px Segoe UI,Arial,sans-serif;padding:13px 28px;border-radius:10px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.45);max-width:92%;text-align:center';
    document.body.appendChild(b);
  }
  b.textContent = t; b.style.display = 'block';
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    context = browser.new_context(
        viewport={"width": 1366, "height": 900},
        record_video_dir=OUT_VIDEO_DIR,
        record_video_size={"width": 1366, "height": 900},
    )
    page = context.new_page()

    def pausa(ms=1600):
        page.wait_for_timeout(ms)

    def rotulo(texto, espera=2200):
        page.evaluate(ROTULO_JS, texto)
        page.wait_for_timeout(espera)

    def shot(nombre):
        page.wait_for_timeout(400)
        page.evaluate("() => { const b = document.getElementById('rotulo-demo'); if (b) b.style.display = 'none'; }")
        page.screenshot(path=f"{OUT_SHOTS}/{nombre}.png", full_page=True)
        page.evaluate("() => { const b = document.getElementById('rotulo-demo'); if (b) b.style.display = 'block'; }")
        print("captura:", nombre)

    # 1. Login como operador: reporta una falla nueva
    page.goto(BASE, wait_until="networkidle")
    pausa(600)
    shot("01-login")
    rotulo("SIGMAP — Demostración de uso  |  Paso 1: el operador inicia sesión")
    page.fill('input[type="email"]', "operador@sigmap.do")
    page.fill('input[type="password"]', "sigmap123")
    pausa(400)
    page.click("button.btn")
    page.wait_for_selector(".kpis", timeout=10000)
    pausa(800)
    shot("02-dashboard-operador")

    click_texto(page, ".sidebar nav button", "Órdenes")
    page.wait_for_selector("tbody tr", timeout=10000)
    pausa(500)
    click_texto(page, "button", "Reportar falla")
    page.wait_for_selector("textarea", timeout=10000)
    pausa(400)

    rotulo("Paso 2: el operador reporta una falla (correctiva, prioridad alta) en la sopladora SOP-01")
    page.select_option("select >> nth=0", label="SOP-01 — Sopladora Aoki AL-250")
    page.select_option("select >> nth=1", "correctivo")
    page.select_option("select >> nth=2", "alta")
    page.fill("textarea", "Vibración anómala en el molde durante el ciclo de soplado.")
    pausa(600)
    shot("03-nueva-orden-formulario")
    click_texto(page, "button", "Crear orden")
    page.wait_for_selector(".alerta.ok", timeout=10000)
    pausa(700)
    shot("04-orden-creada")

    rotulo("El sistema crea la orden y le asigna un folio automáticamente")
    # 2. Cerrar sesión y entrar como supervisor: asigna técnico
    click_texto(page, "button", "Cerrar sesión")
    page.wait_for_selector('input[type="email"]', timeout=10000)
    pausa(500)
    rotulo("Paso 3: el supervisor inicia sesión y asigna un técnico a la orden")
    page.fill('input[type="email"]', "supervisor@sigmap.do")
    page.fill('input[type="password"]', "sigmap123")
    page.click("button.btn")
    page.wait_for_selector(".kpis", timeout=10000)
    pausa(700)
    shot("05-dashboard-supervisor")

    click_texto(page, ".sidebar nav button", "Órdenes")
    page.wait_for_selector("tbody tr", timeout=10000)
    page.wait_for_function("document.body.innerText.includes('OT-1007')", timeout=10000)
    pausa(500)
    click_fila(page, "OT-1007", "Ver")
    page.wait_for_selector(".detalle-grid", timeout=10000)
    pausa(600)
    shot("06-detalle-antes-asignar")

    page.select_option(".acciones select", label="Ramón Cruz")
    page.wait_for_selector(".alerta.ok", timeout=10000)
    pausa(700)
    shot("07-tecnico-asignado")

    click_texto(page, "button", "Cerrar sesión")
    page.wait_for_selector('input[type="email"]', timeout=10000)

    # 3. Entrar como técnico: inicia el trabajo, registra causa raíz y cierra
    pausa(500)
    rotulo("Paso 4: el técnico inicia sesión y ve la orden que se le asignó")
    page.fill('input[type="email"]', "tecnico@sigmap.do")
    page.fill('input[type="password"]', "sigmap123")
    page.click("button.btn")
    page.wait_for_selector(".kpis", timeout=10000)
    pausa(600)

    click_texto(page, ".sidebar nav button", "Órdenes")
    page.wait_for_selector("tbody tr", timeout=10000)
    page.wait_for_function("document.body.innerText.includes('OT-1007')", timeout=10000)
    click_fila(page, "OT-1007", "Ver")
    page.wait_for_selector(".detalle-grid", timeout=10000)
    pausa(600)
    shot("08-tecnico-ve-orden-asignada")

    click_texto(page, "button", "Iniciar trabajo")
    page.wait_for_selector(".alerta.ok", timeout=10000)
    pausa(600)

    rotulo("Paso 5: regla de negocio — una orden correctiva NO puede cerrarse sin causa raíz")
    # Intento de cierre sin causa raíz (debe rechazarse)
    click_texto(page, "button", "Cerrar orden")
    page.wait_for_selector(".alerta.error", timeout=10000)
    pausa(900)
    shot("09-rechazo-cierre-sin-causa-raiz")

    rotulo("Paso 6: el técnico registra el análisis de causa raíz (método de los 5 porqués)")
    click_texto(page, "button", "Registrar análisis")
    page.wait_for_selector("textarea", timeout=10000)
    inputs = page.locator(".card:has-text('causa raíz') input")
    inputs.nth(0).fill("La sopladora vibra de forma anormal durante el ciclo.")
    inputs.nth(1).fill("El molde no está correctamente centrado en su base.")
    inputs.nth(2).fill("Los pernos de anclaje del molde están flojos.")
    page.locator(".card:has-text('causa raíz') textarea").nth(0).fill(
        "Falta de ajuste periódico de los pernos de anclaje del molde en el mantenimiento preventivo.")
    page.select_option(".card:has-text('causa raíz') select", "metodo")
    page.locator(".card:has-text('causa raíz') textarea").nth(1).fill(
        "Incluir el torque de los pernos de anclaje del molde en la rutina preventiva mensual.")
    pausa(700)
    shot("10-formulario-causa-raiz")
    click_texto(page, "button", "Guardar análisis")
    page.wait_for_selector(".alerta.ok", timeout=10000)
    pausa(700)
    shot("11-causa-raiz-guardada")

    click_texto(page, "button", "Cerrar orden")
    page.wait_for_selector(".alerta.ok", timeout=10000)
    pausa(900)
    shot("12-orden-cerrada-con-downtime")

    rotulo("Paso 7: con la causa raíz registrada, la orden se cierra y se calcula el tiempo de parada")
    # 4. Verificar en Máquinas y Reportes que el cierre impactó los indicadores
    rotulo("Paso 8: el historial de la máquina se actualiza con la nueva intervención")
    click_texto(page, ".sidebar nav button", "Máquinas")
    page.wait_for_selector("tbody tr", timeout=10000)
    click_fila(page, "SOP-01", "Historial")  # aquí sí es correcto: pantalla de Maquinas, código único
    page.wait_for_selector(".kpis", timeout=10000)
    pausa(700)
    shot("13-historial-actualizado")

    rotulo("Paso 9: los reportes e indicadores reflejan la orden procesada")
    click_texto(page, "button", "Volver a máquinas")
    page.wait_for_selector("tbody tr", timeout=10000)
    click_texto(page, ".sidebar nav button", "Reportes")
    page.wait_for_selector(".barra-fila", timeout=10000)
    pausa(900)
    shot("14-reportes-actualizados")
    rotulo("Fin de la demostración — SIGMAP", 2500)

    context.close()
    browser.close()
    print("LISTO — video guardado en", OUT_VIDEO_DIR)
