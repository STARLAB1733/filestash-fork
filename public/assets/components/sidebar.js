import { createElement, createRender, onDestroy } from "../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../lib/rx.js";
import ajax from "../lib/ajax.js";
import { toHref } from "../lib/skeleton/router.js";
import { qs, qsa, safe } from "../lib/dom.js";
import { forwardURLParams } from "../lib/path.js";
import { settingsGet, settingsSave } from "../lib/store.js";
import { get as getConfig } from "../model/config.js";
import { loadCSS } from "../helpers/loader.js";
import t from "../locales/index.js";
import cache from "../pages/filespage/cache.js";
import { hooks, mv as mv$ } from "../pages/filespage/model_files.js";
import { extractPath, isDir, isNativeFileUpload, isMobile } from "../pages/filespage/helper.js";
import { mv as mvVL, withVirtualLayer } from "../pages/filespage/model_virtual_layer.js";
import { getCurrentPath } from "../pages/viewerpage/common.js";
import { generateSkeleton } from "./skeleton.js";

export default async function ctrlSidebar(render, {}) {
    if (new URL(location.toString()).searchParams.get("nav") === "false") return;
    else if (window.self !== window.top) return;
    else if (document.body.clientWidth < 850) return;

    const $sidebar = render(createElement(`
        <div class="component_sidebar"><div>
            <h3 class="no-select">
                <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgYXJpYS1oaWRkZW49InRydWUiCiAgIGZvY3VzYWJsZT0iZmFsc2UiCiAgIHJvbGU9ImltZyIKICAgY2xhc3M9Im9jdGljb24gb2N0aWNvbi1zaWRlYmFyLWV4cGFuZCIKICAgdmlld0JveD0iMCAwIDE2IDE2IgogICB3aWR0aD0iMTYiCiAgIGhlaWdodD0iMTYiCiAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgdXNlci1zZWxlY3Q6IG5vbmU7IHZlcnRpY2FsLWFsaWduOiB0ZXh0LWJvdHRvbTsgb3ZlcmZsb3c6IHZpc2libGU7IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc3MjI3IgogICBzb2RpcG9kaTpkb2NuYW1lPSJnaXRodWJmb2xkLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4yLjIgKGIwYTg0ODY1NDEsIDIwMjItMTItMDEpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM3MjMxIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3NzIyOSIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiMwMDAwMDAiCiAgICAgYm9yZGVyb3BhY2l0eT0iMC4yNSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxNC43NSIKICAgICBpbmtzY2FwZTpjeD0iNC4yMDMzODk4IgogICAgIGlua3NjYXBlOmN5PSI4IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTgxNyIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMzk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzcyMjciIC8+CiAgPHBhdGgKICAgICBkPSJtNC4xNzcgNy44MjMgMi4zOTYtMi4zOTZBLjI1LjI1IDAgMCAxIDcgNS42MDR2NC43OTJhLjI1LjI1IDAgMCAxLS40MjcuMTc3TDQuMTc3IDguMTc3YS4yNS4yNSAwIDAgMSAwLS4zNTRaIgogICAgIGlkPSJwYXRoNzIyMyIKICAgICBzdHlsZT0iZmlsbDojNTc1OTVhO2ZpbGwtb3BhY2l0eToxIiAvPgogIDxwYXRoCiAgICAgZD0iTTAgMS43NUMwIC43ODQuNzg0IDAgMS43NSAwaDEyLjVDMTUuMjE2IDAgMTYgLjc4NCAxNiAxLjc1djEyLjVBMS43NSAxLjc1IDAgMCAxIDE0LjI1IDE2SDEuNzVBMS43NSAxLjc1IDAgMCAxIDAgMTQuMjVabTEuNzUtLjI1YS4yNS4yNSAwIDAgMC0uMjUuMjV2MTIuNWMwIC4xMzguMTEyLjI1LjI1LjI1SDkuNXYtMTNabTEyLjUgMTNhLjI1LjI1IDAgMCAwIC4yNS0uMjVWMS43NWEuMjUuMjUgMCAwIDAtLjI1LS4yNUgxMXYxM1oiCiAgICAgaWQ9InBhdGg3MjI1IgogICAgIHN0eWxlPSJmaWxsOiM1NzU5NWE7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=" alt="close">
                <input type="text" placeholder="${t("Your Files")}" />
            </h3>
            <div data-bind="your-files">
                ${generateSkeleton(2)}
            </div>
            <div data-bind="your-tags">
                ${generateSkeleton(2)}
            </div>
        </div>
    `));
    withInstantLoad($sidebar);
    withResize($sidebar);

    const path = getCurrentPath("(/view/|/files/)");

    // fature: file navigation pane
    const $files = qs($sidebar, `[data-bind="your-files"]`);
    ctrlNavigationPane(createRender($files), { $sidebar, path });

    // feature: tag viewer
    const $tags = qs($sidebar, `[data-bind="your-tags"]`);
    effect(rxjs.merge(
        rxjs.of(null),
        rxjs.fromEvent(window, "filestash::tag"),
    ).pipe(
        rxjs.tap(() => ctrlTagPane(createRender($tags), {
            tags: [...$tags.querySelectorAll("a")].map(($tag) => $tag.innerText.trim()),
            path,
        })),
    ));

    // feature: visibility of the sidebar
    const isVisible = () => settingsGet({ visible: true }, "sidebar").visible;
    const forceRefresh = () => window.dispatchEvent(new Event("resize"));
    effect(rxjs.merge(rxjs.fromEvent(window, "keydown")).pipe(
        rxjs.filter((e) => e.key === "b" && e.ctrlKey === true),
        rxjs.tap(() => {
            settingsSave({ visible: $sidebar.classList.contains("hidden") }, "sidebar");
            isVisible() ? $sidebar.classList.remove("hidden") : $sidebar.classList.add("hidden");
            forceRefresh();
        }),
    ));
    effect(rxjs.merge(
        rxjs.fromEvent(window, "resize"),
        rxjs.of(null),
    ).pipe(
        rxjs.tap(() => {
            const $breadcrumbButton = qs(document.body, "[alt=\"sidebar-open\"]");
            if (document.body.clientWidth < 1100) $sidebar.classList.add("hidden");
            else if (isVisible()) {
                $sidebar.classList.remove("hidden");
                $breadcrumbButton.classList.add("hidden");
            } else {
                $sidebar.classList.add("hidden");
                $breadcrumbButton.classList.remove("hidden");
            }
        }),
        rxjs.catchError((err) => {
            if (err instanceof DOMException) return rxjs.EMPTY;
            throw err;
        }),
    ));
    effect(onClick(qs($sidebar, `img[alt="close"]`)).pipe(
        rxjs.tap(() => {
            settingsSave({ visible: false }, "sidebar");
            $sidebar.classList.add("hidden");
            forceRefresh();
        }),
    ));
}

const withResize = (function() {
    let memory = null;
    return ($sidebar) => {
        const $resize = createElement(`<div class="resizer"></div>`);
        effect(rxjs.fromEvent($resize, "mousedown").pipe(
            rxjs.mergeMap((e0) => rxjs.fromEvent(document, "mousemove").pipe(
                rxjs.takeUntil(rxjs.fromEvent(document, "mouseup")),
                rxjs.startWith(e0),
                rxjs.pairwise(),
                rxjs.map(([prevX, currX]) => currX.clientX - prevX.clientX),
                rxjs.scan((width, delta) => width + delta, $sidebar.clientWidth),
            )),
            rxjs.startWith(memory),
            rxjs.filter((w) => !!w),
            rxjs.map((w) => Math.min(Math.max(w, 250), 350)),
            rxjs.tap((w) => {
                $sidebar.style.width = `${w}px`;
                memory = w;
            }),
        ));
        $sidebar.appendChild($resize);
    };
}());

const withInstantLoad = (function() {
    const state = { scrollTop: 0, $cache: null };
    return ($sidebar) => {
        if (state.$cache) {
            $sidebar.replaceChildren(state.$cache);
            $sidebar.firstElementChild.scrollTop = state.scrollTop;
        }
        onDestroy(() => {
            state.$cache = $sidebar.firstElementChild?.cloneNode(true);
            state.scrollTop = $sidebar.firstElementChild.scrollTop;
        });
    };
}());

async function ctrlNavigationPane(render, { $sidebar, path }) {
    // feature: init dom
    const $fs = document.createDocumentFragment();
    const dirname = path.replace(new RegExp("[^\/]*$"), "");
    const chunks = dirname.split("/");
    for (let i=1; i<chunks.length; i++) {
        const cpath = chunks.slice(0, i).join("/") + "/";
        const $ul = await _createListOfFiles(cpath, {
            basename: chunks[i],
            dirname,
        });
        if (cpath === "/") $fs.appendChild($ul);
        else qs($fs, `[data-path="${cpath}"] ul`).appendChild($ul);
    }
    render($fs);

    // feature: listen for updates
    effect(new rxjs.Observable((subscriber) => {
        const cleaners = [
            hooks.ls.listen(({ path }) => subscriber.next(path)),
            hooks.mutation.listen(async({ op, path }) => {
                if (["mv", "mkdir", "rm"].indexOf(op) === -1) return;
                subscriber.next(path);
            }),
        ];
        return () => cleaners.map((fn) => fn());
    }).pipe(
        rxjs.tap(async(path) => {
            const display = path === "/" ? render : createRender(qs($sidebar, `[data-path="${path}"] ul`));
            display(await _createListOfFiles(path, {}));
        }),
    ));

    // feature: highlight current selection
    try {
        const $active = qs($sidebar, `[data-path="${dirname}"] a`);
        const checkVisible = ($el) => {
            const rect = $el.getBoundingClientRect();
            return rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth);
        };
        $active.setAttribute("aria-selected", "true");
        const tags = new URLSearchParams(location.search).getAll("tag").length;
        if (checkVisible($active) === false && tags === 0) {
            $active.offsetTop < window.innerHeight
                ? $sidebar.firstChild.scrollTo({ top: 0, behavior: "smooth" })
                : $active.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    } catch (err) {}

    // feature: quick search
    effect(rxjs.fromEvent(qs($sidebar, "h3 input"), "keydown").pipe(
        rxjs.debounceTime(200),
        rxjs.tap((e) => {
            const inputValue = e.target.value.toLowerCase();
            qsa($sidebar, "[data-bind=\"your-files\"] li a").forEach(($li) => {
                if (inputValue === "") {
                    $li.classList.remove("hidden");
                    $sidebar.classList.remove("search");
                    return;
                }
                $sidebar.classList.add("search");
                qs($li, "div").textContent.toLowerCase().indexOf(inputValue) === -1
                    ? $li.classList.add("hidden")
                    : $li.classList.remove("hidden");
            });
        }),
        rxjs.finalize(() => $sidebar.classList.remove("search")),
    ));
}

async function ctrlTagPane(render, { tags, path }) {
    if (getConfig("enable_tags", false) === false) {
        render(document.createElement("div"));
        return;
    }
    const $page = createElement(`
        <div>
            <h3 class="no-select">
                <img src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIHZlcnNpb249IjEuMSIgd2lkdGg9IjE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICAgIDxwYXRoIHN0eWxlPSJmaWxsOiAjNTc1OTVhOyIgZD0iTTEgNy43NzVWMi43NUMxIDEuNzg0IDEuNzg0IDEgMi43NSAxaDUuMDI1Yy40NjQgMCAuOTEuMTg0IDEuMjM4LjUxM2w2LjI1IDYuMjVhMS43NSAxLjc1IDAgMCAxIDAgMi40NzRsLTUuMDI2IDUuMDI2YTEuNzUgMS43NSAwIDAgMS0yLjQ3NCAwbC02LjI1LTYuMjVBMS43NTIgMS43NTIgMCAwIDEgMSA3Ljc3NVptMS41IDBjMCAuMDY2LjAyNi4xMy4wNzMuMTc3bDYuMjUgNi4yNWEuMjUuMjUgMCAwIDAgLjM1NCAwbDUuMDI1LTUuMDI1YS4yNS4yNSAwIDAgMCAwLS4zNTRsLTYuMjUtNi4yNWEuMjUuMjUgMCAwIDAtLjE3Ny0uMDczSDIuNzVhLjI1LjI1IDAgMCAwLS4yNS4yNVpNNiA1YTEgMSAwIDEgMSAwIDIgMSAxIDAgMCAxIDAtMloiPjwvcGF0aD4NCjwvc3ZnPg0K" alt="tag">
                ${t("Tags")}
            </h3>
            <ul>
                <li data-bind="taglist"></li>
            </ul>
        </div>
    `);
    const renderTaglist = createRender(qs($page, `[data-bind="taglist"]`));
    effect(rxjs.merge(
        tags.length === 0 ? rxjs.EMPTY : rxjs.of({ tags }),
        ajax({
            url: forwardURLParams(`api/metadata/search`, ["share"]),
            method: "POST",
            responseType: "json",
            body: {
                tags: [],
                path,
            },
        }).pipe(
            rxjs.map(({ responseJSON }) => {
                const tags = {};
                Object.values(responseJSON.results).forEach((forms) => {
                    forms.forEach(({ id, value = "" }) => {
                        if (id !== "tags") return;
                        value.split(",").forEach((tag) => {
                            tags[tag.trim()] = null;
                        });
                    });
                });
                return { tags: Object.keys(tags).sort(), response: responseJSON.results };
            }),
            rxjs.catchError(() => rxjs.of({ tags: [] })),
        ),
    ).pipe(
        // feature: create the DOM
        rxjs.mergeMap(({ tags, response }) => {
            render($page);
            if (tags.length === 0) {
                $page.classList.add("hidden");
                return rxjs.EMPTY;
            }
            $page.classList.remove("hidden");
            const $fragment = document.createDocumentFragment();
            tags.forEach((name) => {
                const $tag = createElement(`
                    <a data-link draggable="false" class="no-select">
                        <div class="ellipsis">
                            <span class="hash"></span>
                            ${safe(name)}
                        </div>
                        <svg class="component_icon" draggable="false" alt="close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </a>
                `);
                const url = new URL(location.href);
                if (url.searchParams.getAll("tag").indexOf(name) === -1) {
                    $tag.setAttribute("href", forwardURLParams(toHref("/files" + path.replace(new RegExp("[^\/]+$"), "") + "?tag=" + name), ["share", "tag"]));
                } else {
                    url.searchParams.delete("tag", name);
                    $tag.setAttribute("href", url.toString());
                    $tag.setAttribute("aria-selected", "true");
                }
                $fragment.appendChild($tag);
            });
            return rxjs.of({ $list: renderTaglist($fragment), response });
        }),
        // feature: tag mouse hover effect
        rxjs.tap(({ $list, response }) => {
            if (isMobile) return;
            else if (!response) return;
            $list.childNodes.forEach(($tag) => {
                if ($tag.getAttribute("aria-selected") === "true") return;
                const tagname = $tag.innerText.trim();
                const paths = [];
                for (const path in response) {
                    const form = response[path].find(({ id }) => id === "tags");
                    if (!form) continue;
                    const tags = form.value.split(",").map((val) => val.trim());
                    if (tags.indexOf(tagname) === -1) continue;
                    paths.push(path);
                }
                $tag.onmouseenter = () => {
                    const $things = document.querySelectorAll(".component_thing");
                    $things.forEach(($thing) => {
                        const thingpath = $thing.getAttribute("data-path");
                        for (let i=0; i<paths.length; i++) {
                            if (paths[i].indexOf(thingpath) === 0) {
                                $thing.classList.add("hover");
                                break;
                            }
                        }
                    });
                    $tag.onmouseleave = () => $things.forEach(($thing) => $thing.classList.remove("hover"));
                };
            });
        }),
    ));
}

const mv = (from, to) => withVirtualLayer(
    mv$(from, to),
    mvVL(from, to),
);

async function _createListOfFiles(path, { basename = null, dirname = null }) {
    const r = await cache().get(path);
    const whats = r === null
        ? (basename ? [basename] : [])
        : r.files
            .filter(({ type, name }) => type === "directory" && name[0] !== ".")
            .map(({ name }) => name)
            .sort();

    const MAX_DISPLAY = 100;
    const $lis = document.createDocumentFragment();
    const $fragment = document.createDocumentFragment();
    const $ul = document.createElement("ul");
    for (let i=0; i<whats.length; i++) {
        const currpath = path + whats[i] + "/";
        const $li = createElement(`
            <li data-path="${safe(currpath)}" title="${safe(currpath)}" class="no-select">
                <a data-link href="${safe(forwardURLParams(toHref("/files" + encodeURIComponent(currpath).replaceAll("%2F", "/")), ["share", "canary"]))}" draggable="false" aria-selected="false">
                    <img class="component_icon" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgYXJpYS1oaWRkZW49InRydWUiCiAgIGZvY3VzYWJsZT0iZmFsc2UiCiAgIGNsYXNzPSJvY3RpY29uIG9jdGljb24tZmlsZS1kaXJlY3RvcnktZmlsbCIKICAgdmlld0JveD0iMCAwIDE2IDE2IgogICB3aWR0aD0iMTYiCiAgIGhlaWdodD0iMTYiCiAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgdXNlci1zZWxlY3Q6IG5vbmU7IHZlcnRpY2FsLWFsaWduOiB0ZXh0LWJvdHRvbTsgb3ZlcmZsb3c6IHZpc2libGU7IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxNTgiCiAgIHNvZGlwb2RpOmRvY25hbWU9ImdpdGh1YmZvbGRlci5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yIChiMGE4NDg2NTQxLCAyMDIyLTEyLTAxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTYyIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MTYwIgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzAwMDAwMCIKICAgICBib3JkZXJvcGFjaXR5PSIwLjI1IgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiNkMWQxZDEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjcxLjYyNSIKICAgICBpbmtzY2FwZTpjeD0iNy44MTE1MTgzIgogICAgIGlua3NjYXBlOmN5PSI4IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMjAzNiIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMzk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzE1OCIgLz4KICA8cGF0aAogICAgIGQ9Ik0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1di04LjVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMWwtLjktMS4yQzYuMDcgMS4yNiA1LjU1IDEgNSAxSDEuNzVaIgogICAgIGlkPSJwYXRoMTU2IgogICAgIHN0eWxlPSJmaWxsOiM1NzU5NWE7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=" alt="directory">
                    <div class="ellipsis">${safe(whats[i])}</div>
                </a>
                <ul></ul>
            </li>
        `);
        const $link = qs($li, "a");
        if ($link.getAttribute("href") === "/files" + dirname) {
            $link.removeAttribute("href", "");
            $link.removeAttribute("data-link");
        } else {
            $link.ondrop = async(e) => {
                $link.classList.remove("highlight");
                const from = e.dataTransfer.getData("path");
                let to = $link.parentElement.getAttribute("data-path");
                const [, fromName] = extractPath(from);
                to += fromName;
                if (isDir(from)) to += "/";
                if (from === to) return;
                await mv(from, to).toPromise();
            };
            $link.ondragover = (e) => {
                if (isNativeFileUpload(e)) return;
                e.preventDefault();
                $link.classList.add("highlight");
            };
            $link.ondragleave = () => {
                $link.classList.remove("highlight");
            };
        }

        if (i <= MAX_DISPLAY) $lis.appendChild($li);
        else $fragment.appendChild($li);
        if (i === MAX_DISPLAY) {
            const $more = createElement(`
                <li title="..." class="no-select pointer">
                    <a><div class="ellipsis">...</div></a>
                </li>
            `);
            $lis.appendChild($more);
            $more.onclick = () => {
                $ul.appendChild($fragment);
                $more.remove();
            };
        }
    }
    $ul.appendChild($lis);
    return $ul;
}

export function init() {
    return loadCSS(import.meta.url, "./sidebar.css");
}
