import { io, Socket } from "socket.io-client";

interface ServerToClientEvents {
    pingAt: (data:string) => void;
    currentMapData: (data:string) => void;
}

interface ClientToServerEvents {
    requestPing: (data:{pingX:number, pingY:number}) => void;

    changeTurn: (data: {id: ID}) => void;

    createNewMap: (data: {name:string}) => void; 

    switchBlockerType: (data:{type:number}) => void;
    invertBlockers: () => void;
    
    setMapData: (data:{gridColor?:`#${string}`, map?:string, y?:number, x?:number, offsetX?:number, offsetY?:number, diagonalMovement?:string, system?:string}) => void;
    changeSelectedMap: (data:{selectedMap:string}) => void;

    addDrawing: (data:{shape:string, visible:boolean, x?:number, y?:number, link?:ID, radius?:number,
        trueColor?:`#${string}`, width?:number, height?:number, verts?:tmpVert[],
        angle?:number, range?:number, is90Deg?:boolean}) => void;
    editDrawing: (data:{id:ID, group?:number|null, verts?:Vert[], visible?:boolean, radius?:number,
        range?:number, x?:number, y?:number, both?:boolean, moveShapeGroup?:boolean, angle?:number}) => void;
    removeDrawing: (data:{id:ID}) => void;
    
    addVert: (data:{id:ID, vertID:ID}) => void;
    editVert: (data:{id:ID, vertID:ID, x?:number, y?:number}) => void;
    removeVert: (data:{type: 'blocker'|'line', id:ID, vertID:ID}) => void;

    addPolyBlocker: (data:{x:number, y:number, offset:{min:number}}) => void;
    addCustomPolyBlocker: (data:{newPolyBlockerVerts:tmpVert[]}) => void;
    movePolyBlocker: (data:{id:ID, offsetX?:number, offsetY?:number}) => void;
    togglePolyBlocker: (data:{id:ID}) => void;
    removePolyBlocker: (data:{id:ID}) => void;

    addBlocker: (data:{x?:number, y?:number, width?:number, height?:number}) => void;
    editBlocker: (data:{id:ID, x?:number, y?:number, width?:number, height?:number}) => void;
    removeBlocker: (data:{id:ID}) => void;
    
    createToken: (data:{size?:number, dm?:boolean, image?:string, text:string, x?:number, y?:number, concentrating?:boolean,
        status?:string, layer:number, group?:number, hideTracker?:boolean, hp?:`${number}/${number}`,
        notes?:string, initiative?:number, name?:string, ac?:number, hidden?:boolean}) => void;
    moveToken: (data:{id:ID, x:number, y:number, bypassLink:boolean}) => void;
    editToken: (data:{id:ID, size?:number, status?:string, layer?:number, group?:number|null, text?:string,
        dm?:boolean, image?:string, hideTracker?:boolean, hp?:`${number}/${number}`|null, notes?:string,
        initiative?:number|null, name?:string, ac?:number|null, mentalDef?:number|null, physicalDef?:number|null,
        refDef?:number|null, fortDef?:number|null, willDef?:number|null, concentrating?:boolean}) => void;
    setTokenHidden: (data:{id:ID, hidden:boolean}) => void;
    removeToken: (data:{id:ID}) => void;    

    switchTrackerPosition: (data:{origin:ID, target:ID}) => void;    
    sortTracker: () => void;

    
    clearTokens: () => void;
    clearDrawings: () => void;
    clearBlockers: () => void;
}

type ID = `${string}-${string}-${string}-${string}-${string}`;

type HTMLSVGElement = HTMLCanvasElement & SVGElement;

interface MapData {
    blockerType: number,
    gridColor: `#${string}`,
    antiBlockerOn: boolean,
    maps: string[],
    mapName: string,
    tokenList: string[],
    dmTokenList: string[],
    mapSourceList: string[],
    map: string,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
    tokens: Token[],
    drawings: Shape[],
    polyBlockers: PolyBlocker[],
    blockers: Blocker[],
    removedTokens: number,
    currentTurn: ID|undefined,
    diagonalMovement: string,
    system: string,
}

interface PolyBlocker {
    id: ID,
    inactive: boolean,
    verts: Vert[],
}

interface Blocker {
    id: ID,
    x: number,
    y: number,
    width: number,
    height: number,
}

interface Token {
    id: ID,
    size: number,
    x: number,
    y: number,
    image?: string,
    dm: boolean,
    layer: number,
    name?: string,
    notes?: string,
    initiative?: number,
    ac?: number,
    mentalDef?: number,
    physicalDef?: number,
    refDef?: number,
    fortDef?: number,
    willDef?: number,
    hp?: `${number}/${number}`,
    status?: string,
    group?: number,
    concentrating?: boolean,
    hideTracker?: boolean,
    hidden?: boolean,
    rotation?: number,
    objectLock?: boolean,
    text: string
}

interface Shape {
    id: ID,
    visible: boolean,
    shape: 'circle' | 'square' | 'cone' | '5ftLine' | 'vertexLine',
    is90Deg: boolean,
    trueColor: `#${string}`,
    verts: Vert[],
    x: number,
    y: number,
    width: number,
    radius: number,
    height: number,
    angle: number,
    range: number,
    group: number,
    link: ID,
}

interface Vert {
    id: ID,
    x: number,
    y: number,
}

interface tmpVert {
    x: number,
    y: number,
}

interface ContextMenuOption {
    text: string,
    callback: () => void,
    hasSubMenu: boolean,
}

interface SubContextMenuOption {
    text: string,
    callback: () => void,
}

const socket : Socket<ServerToClientEvents, ClientToServerEvents> = io();
let starting = true;
let gridActive = true;
let gridSnap = true;
let sideMenuExpanded = true;
const blockerOutlineColor = "violet";
const shapeWidth = 2;
const GridLineWidth = 1;
const feetPerSquare = 5.0;

if(!navigator.userAgent.includes("Chrome") && !navigator.userAgent.indexOf("Firefox")) {
    alert("Room of thought is only supported for firefox and chrome. Some features may be unavailable!");
}

let offsetX = 0;
let offsetY = 0;
let GridColor:`#${string}` = "#222222FF";
let shapeColor:`#${string}` = "#FF0000FF";
//Used to draw the hitbox of shapes to make it easier to move them
const $UI = {
    systemSelect: document.getElementById("systemSelect")! as HTMLInputElement,
    AC13thAge: document.getElementById("AC13thAge")! as HTMLDivElement,
    mentalDef: document.getElementById("mentalDef")! as HTMLInputElement,
    physicalDef: document.getElementById("physicalDef")! as HTMLInputElement,
    AC4e: document.getElementById("AC4e")! as HTMLDivElement,
    refDef: document.getElementById("refDef")! as HTMLInputElement,
    fortDef: document.getElementById("fortDef")! as HTMLInputElement,
    willDef: document.getElementById("willDef")! as HTMLInputElement,
    diagonalTypeSelect: document.getElementById("diagonalType")! as HTMLSelectElement,
    hAlignHandles: document.getElementById("hAlignHandles")! as HTMLDivElement,
    vAlignHandles: document.getElementById("vAlignHandles")! as HTMLDivElement,
    startGridAligner: document.getElementById("startGridAligner")! as HTMLButtonElement,
    sideMenuCollapse: document.getElementById("sideMenuCollapse")! as HTMLDivElement,
    sideMenuToggle: document.getElementById("sideMenuToggle")! as HTMLButtonElement,
    sideMenuToggleIcon: document.getElementById("sideMenuToggleIcon")!,
    bulkTokenBox: document.getElementById("bulkTokenBox")! as HTMLDivElement,
    bulkTokenBoxHeader: document.getElementById("bulkTokenBoxHeader")! as HTMLDivElement,
    bulkTokenBoxBody: document.getElementById("bulkTokenBoxBody")! as HTMLDivElement,
    bulkTokenImageSelect: document.getElementById("bulkTokenImageSelect")! as HTMLSelectElement,
    bulkTokenNameInput: document.getElementById("bulkTokenNameInput")! as HTMLInputElement,
    bulkTokenAmountInput: document.getElementById("bulkTokenAmountInput")! as HTMLInputElement,
    bulkTokenSize: document.getElementById('bulkTokenSize')! as HTMLInputElement,
    bulkTokenGroup: document.getElementById('bulkTokenGroup')! as HTMLInputElement,
    bulkTokenHP: document.getElementById('bulkTokenHP')! as HTMLInputElement,
    bulkTokenAC: document.getElementById('bulkTokenAC')! as HTMLInputElement,
    bulkTokenInit: document.getElementById('bulkTokenInit')! as HTMLInputElement,
    bulkTokenDex: document.getElementById('bulkTokenDex')! as HTMLInputElement,
    bulkTokenHideTracker: document.getElementById('bulkTokenHideTracker')! as HTMLInputElement,
    bulkTokenHideToken: document.getElementById('bulkTokenHideToken')! as HTMLInputElement,
    bulkTokenRollOnce: document.getElementById('bulkTokenRollOnce')! as HTMLInputElement,
    bulkTokenRollEach: document.getElementById('bulkTokenRollEach')! as HTMLInputElement,
    bulkTokenConfirm: document.getElementById("bulkTokenConfirm")! as HTMLButtonElement,    
    mapOptionsMenuBody: document.getElementById("mapOptionsMenuBody")! as HTMLDivElement,
    mapOptionsMenuClose: document.getElementById("mapOptionsMenuClose")! as HTMLButtonElement,
    mapOptionsMenuBox: document.getElementById("mapOptionsMenuBox")! as HTMLDivElement,
    notesBox: document.getElementById("notesBox")! as HTMLDivElement,
    notesBoxTextArea: document.getElementById("notesBoxTextArea")! as HTMLTextAreaElement,
    gridMap: document.getElementById("gridMap")! as HTMLCanvasElement,
    board: document.getElementById("board")! as HTMLDivElement,
    viewport: document.getElementById("viewport")! as HTMLDivElement,
    mapImage: document.getElementById("mapImage")! as HTMLImageElement,
    shapeMap: document.getElementById("shapeMap")! as HTMLSVGElement,
    tokensDiv: document.getElementById("tokens")! as HTMLDivElement,
    blockersDiv: document.getElementById("blockers")! as HTMLDivElement,
    mapSourceSelect: document.getElementById("mapSource")! as HTMLSelectElement,
    mapXInput: document.getElementById("mapX")! as HTMLInputElement,
    mapYInput: document.getElementById("mapY")! as HTMLInputElement,
    offsetXInput: document.getElementById("offsetX")! as HTMLInputElement,
    offsetYInput: document.getElementById("offsetY")! as HTMLInputElement,
    blockerTypeSelect: document.getElementById("blockerType")! as HTMLSelectElement,
    initiativeTrackerDiv: document.getElementById("initiativeTrackerDiv")! as HTMLDivElement,
    noteArea: document.getElementById("notesTextArea")! as HTMLTextAreaElement,
    detailsScreen: document.getElementById("detailsScreen")! as HTMLDivElement,
    initiativeInput: document.getElementById("detailsInitiative")! as HTMLInputElement,
    nameInput: document.getElementById("detailsNameInput")! as HTMLInputElement,
    acInput: document.getElementById("armorClass")! as HTMLInputElement,
    currentHpInput: document.getElementById("currentHitpoints")! as HTMLInputElement,
    maxHpInput: document.getElementById("maxHitpoints")! as HTMLInputElement,
    groupIdInput: document.getElementById("detailsGroup")! as HTMLInputElement,
    statusInput: document.getElementById("detailsStatusInput")! as HTMLInputElement,
    detailsIcon: document.getElementById("detailsIcon")! as HTMLImageElement,
    concentratingInput: document.getElementById("concentrating")! as HTMLButtonElement,
    hideTrackerInput: document.getElementById("visibility")! as HTMLButtonElement,
    hpIcon: document.getElementById("hitpointsIcon")! as HTMLImageElement,
    sideMenu: document.getElementById("sideMenu")! as HTMLDivElement,
    gridColorPicker: document.getElementById("gridColorPicker")! as HTMLInputElement,
    mapSelect: document.getElementById("mapSelect")! as HTMLSelectElement,
    createNewMapButton: document.getElementById("createNewMapButton")! as HTMLButtonElement,
    polyBlockers: document.getElementById("polyBlockers")! as HTMLDivElement,
    polyBlockerHandles: document.getElementById("polyBlockerHandles")! as HTMLDivElement,
    newPolyBlockerHandles: document.getElementById("newPolyBlockerHandles")! as HTMLDivElement,
    shapeHandles: document.getElementById("shapeHandles")! as HTMLDivElement,
    antiBlockerMap: document.getElementById("antiBlockerMap")! as HTMLCanvasElement,
    initSearch: document.getElementById("initSearch")! as HTMLInputElement,
    quickPolyButton: document.getElementById("quickPolyButton")! as HTMLButtonElement,
    colorPickerButton: document.getElementById("colorPickerButton")! as HTMLButtonElement,
    customMenu: document.getElementById("contextMenu")! as HTMLDivElement,
    sortTracker: document.getElementById("sortTracker")! as HTMLButtonElement,
    toggleSettings: document.getElementById("toggleSettingsButton")! as HTMLButtonElement,
    toggleGrid: document.getElementById("toggleGridButton")! as HTMLButtonElement,
    toggleSnap: document.getElementById("toggleSnapButton")! as HTMLButtonElement,
    colorPickerPreview: document.getElementById("colorPickerPreview")! as HTMLDivElement,
    redSlider: document.getElementById("redSlider")! as HTMLInputElement,
    greenSlider: document.getElementById("greenSlider")! as HTMLInputElement,
    blueSlider: document.getElementById("blueSlider")! as HTMLInputElement,
    opacitySlider: document.getElementById("opacitySlider")! as HTMLInputElement,
    toggleBlockerEditing: document.getElementById("toggleBlockerEditing")! as HTMLButtonElement,
    clearTokens: document.getElementById("clearTokensButton")!,
    clearDrawings: document.getElementById("clearDrawingsButton")!,
    clearBlockers: document.getElementById("clearBlockersButton")!,
    invertBlockers: document.getElementById("invertBlockerButton")!,
    togglePlayerMode: document.getElementById("togglePlayerMode")!,
    customSubMenu: document.getElementById("subContextMenu")!,
}
for (const [elName, element] of Object.entries($UI)) {
    if (element === null) throw new Error(`${elName} is undefined! Check the IDs!`);
}

//Detail screen vars
const gridCanvas = $UI.gridMap.getContext("2d")!;
const antiBlockerContext = $UI.antiBlockerMap.getContext("2d", {willReadFrequently: true})!;
let mapData : MapData;
let gridSize : {x:number, y:number, min:number};
const blockerDragOffset = {x: 0, y: 0};
const shapeDragOffset = {x: 0, y: 0};

const blockerMarkers = {x: 0, y: 0, width: 0, height: 0};
const circleMarkers = {x: 0, y: 0, radius: 0};
const squareMarkers = {x: 0, y: 0, width: 0, height: 0};
const lineMarkers = {x: 0, y: 0, destX: 0, destY: 0, range: 100};
const thickLineMarkers = {x: 0, y: 0, range: 100, linkId: '0-0-0-0-0' as ID};
const coneMarkers = {x: 0, y: 0, range: 100, tokenSize: 1, is90Deg: false, linkId: '0-0-0-0-0' as ID};

let isDM = false;
const shapeColorCookie = getCookie("shapeColor");
if (shapeColorCookie === "") {
    setCookie("shapeColor", shapeColor);
} else {
    shapeColor = shapeColorCookie as `#${string}`;
}

const flag = {
    blockerEditMode: false,
    playerMode: false,
    quickPolyBlockerMode: false,
    gridAlignMode: false,
    controlPressed: false,
    isPanning: false,
    isPlacingBlocker: false,
    isPlacingSquare: false,
    isPlacingLine: false,
    isPlacing5ftLine: false,
    isPlacingCone: false,
    isMovingShape: false,
    isMovingCone: false,
    isMoving5ftLine: false,
    isDraggingBlocker: false,
    isPlacingBulkOrigin: false,
}
const draggedBlocker = {x: 0, y: 0};
const oldMousePos = {x: 0, y: 0};
const oldScrollPos = {x: 0, y: 0};
let movingShapeId : ID;
let selectedToken : ID;
let selectedBlocker : ID;
let selectedShapeId : ID;
let selectedTokenData : Token;
let oldDataString = "";
let oldParsedData : MapData;
let baseTokenIndex = 4;
let shapeDragStartAngle = 0;
const polyDragOffset = {x: 0, y: 0};
let newPolyBlockerVerts = new Array<tmpVert>();

const mapPreload = new Image();

updateButtonColors();

function Setup() {
    if (getCookie("isDM") == '1') {
        isDM = true;
    } else {
        const elementsToRemove = document.getElementsByClassName("dmOnly");
        for (let i = elementsToRemove.length - 1; i >= 0; i--) {
            elementsToRemove[i]?.parentElement?.removeChild(elementsToRemove[i]);
        }
    }

    SyncSideMenu();
    
    setColor(shapeColor);
    $UI.quickPolyButton.style.display = (mapData.blockerType == 1 && isDM) ? "" : "none";
    
    if (!mapData.blockerType) {
        socket.emit("switchBlockerType", {type: 0});
    }
    $UI.blockerTypeSelect.value = mapData.blockerType?.toString() ?? "0";
    
    if (isDM) {
        $UI.shapeMap.style.zIndex = '941';
        baseTokenIndex = 500;
    } else {
        baseTokenIndex = 0;
    }
}

socket.on('pingAt', (dataString) => {
    const data = JSON.parse(dataString) as {pingX:number, pingY:number};
    const pingCircle = document.createElement('div');
    pingCircle.className = 'ping';
    pingCircle.style.left = data.pingX.toString();
    pingCircle.style.top = data.pingY.toString();
    pingCircle.style.setProperty('transform', `translate(-50%, -50%)`);
    $UI.board.appendChild(pingCircle);
    setTimeout(() => {
        $UI.board.removeChild(pingCircle);
    }, 5000);
});

socket.on('currentMapData', (dataString) => {
    mapData = JSON.parse(dataString) as MapData;
    if (oldDataString == dataString) { return; }

    if (starting) {
        Setup();
        starting = false;
    } 

    GridColor = mapData.gridColor;
    document.body.style.setProperty("--antiBlocker-color", (isDM && !flag.playerMode)?"#00000080":"#000000FF");
    document.body.style.setProperty("--blocker-color", mapData.antiBlockerOn ? ((isDM && !flag.playerMode)?"#00000080":"#000000FF") : "#00000000");

    $UI.mapSelect.innerHTML = "";
    for (const map of mapData.maps) {
        $UI.mapSelect.insertAdjacentHTML('beforeend', `<option value="${map}">${map}</option>`);
    }
    $UI.mapSelect.value = mapData.mapName;

    if (document.activeElement != $UI.bulkTokenImageSelect) {
        $UI.bulkTokenImageSelect.innerHTML = "";
        const tmpOption = document.createElement("option");
        tmpOption.value = "number";
        tmpOption.innerText = "Auto number";
        $UI.bulkTokenImageSelect.append(tmpOption);
        for (const playerImage of mapData.tokenList) {
            $UI.bulkTokenImageSelect.insertAdjacentHTML('beforeend', `<option value="${playerImage}">${playerImage}</option>`);
        }
        for (const dmTokenImage of mapData.dmTokenList) {
            $UI.bulkTokenImageSelect.insertAdjacentHTML('beforeend', `<option value="${dmTokenImage}">${dmTokenImage}</option>`);
        }
    }

    if (document.activeElement != $UI.mapSourceSelect) {
        $UI.mapSourceSelect.innerHTML = "";
        for (const mapSource of mapData.mapSourceList) {
            $UI.mapSourceSelect.insertAdjacentHTML('beforeend', `<option value="${mapSource}">${mapSource}</option>`);
        }
        $UI.mapSourceSelect.value = mapData.map;
    }

    if (document.activeElement!=$UI.mapYInput) { $UI.mapYInput.value = mapData.y.toString(); }
    if (document.activeElement!=$UI.mapXInput) { $UI.mapXInput.value = mapData.x.toString(); }
    if (document.activeElement!=$UI.offsetXInput) { $UI.offsetXInput.value = mapData.offsetX.toString(); }
    if (document.activeElement!=$UI.offsetYInput) { $UI.offsetYInput.value = mapData.offsetY.toString(); }
    if (document.activeElement!=$UI.gridColorPicker) { $UI.gridColorPicker.value = mapData.gridColor.toString(); }
    if (document.activeElement!=$UI.diagonalTypeSelect) { $UI.diagonalTypeSelect.value = mapData.diagonalMovement; }
    if (document.activeElement!=$UI.systemSelect) { $UI.systemSelect.value = mapData.system; }
    offsetX = mapData.offsetX;
    offsetY = mapData.offsetY;
    if (mapData.map!=(oldParsedData?oldParsedData.map:"")) {
        console.log("Switching/Redrawing map!");
        selectedToken = `0-0-0-0-0`;
        selectedBlocker = `0-0-0-0-0`;
        selectedShapeId = `0-0-0-0-0`;
        $UI.detailsScreen.style.display = "none";
        mapPreload.src = "/public/maps/" + mapData.map;

        mapPreload.onload = () => {
            $UI.blockerTypeSelect.value = mapData.blockerType?.toString() ?? "0";
            $UI.mapSourceSelect.value = mapData.map;
            $UI.mapYInput.value = mapData.y.toString();
            $UI.mapXInput.value = mapData.x.toString();
            $UI.offsetXInput.value = mapData.offsetX.toString();
            $UI.offsetYInput.value = mapData.offsetY.toString();
            flag.quickPolyBlockerMode = false;
            $UI.quickPolyButton.style.display = (mapData.blockerType == 1 && isDM) ? "" : "none";
            drawCanvas();
            updateButtonColors();
            oldDataString = dataString;
            oldParsedData = (oldDataString ? JSON.parse(oldDataString) : oldParsedData) as MapData;
        }
    } else {
        let skipMapRedraw = true;
        if (oldParsedData.x !== mapData.x) { skipMapRedraw = false; }
        if (oldParsedData.y !== mapData.y) { skipMapRedraw = false; }
        if (oldParsedData.offsetX !== mapData.offsetX) { skipMapRedraw = false; }
        if (oldParsedData.offsetY !== mapData.offsetY) { skipMapRedraw = false; }
        if (oldParsedData.gridColor !== mapData.gridColor) { skipMapRedraw = false; }
        drawCanvas(skipMapRedraw);
        oldDataString = dataString;
        oldParsedData = (oldDataString?JSON.parse(oldDataString):oldParsedData) as MapData;
    }
    $UI.AC4e.style.display = mapData.system !== '4e' ? 'none' : '';
    $UI.AC13thAge.style.display = mapData.system !== '13thAge' ? 'none' : '';
});

function returnToken(id:ID) {
    return mapData.tokens.find((t) => t.id === id);
}

//#region Drag system
let draggableElements = new Array<HTMLElement>();
function draggableElement(element:HTMLElement,
followMouse:boolean,
pickupElement?:(e:MouseEvent, o:{x:number, y:number})=>void,
dropElement?:(e:MouseEvent, o:{x:number, y:number})=>void,
moveElement?:(e:MouseEvent, o:{x:number, y:number})=>void,
checkBlocker?:boolean,
followCondition?:(doFollow:boolean[], e:MouseEvent)=>void,
ignoreElement?:HTMLElement,
zoomCompensation=true) {
    const offset = {x: 0, y: 0};
    const doFollow : boolean[] = [false];
    element.draggable = false;
    element.setAttribute("dragging", '0');
    element.setAttribute("checkBlocker", checkBlocker?.toString() ?? "false");
    element.addEventListener("mousedown", (e) => {
        if (e.button !== 0) { return; }
        if (e.target !== null && ignoreElement !== undefined && getAncestry(e.target as HTMLElement).includes(ignoreElement)) { return; }
        if (checkBlocker && !CheckAntiBlockerPixel(e) && (!isDM || flag.playerMode)) {
            e.preventDefault();
            flag.isPanning = true;
            oldMousePos.x = e.pageX;
            oldMousePos.y = e.pageY;
            oldScrollPos.x = $UI.viewport.scrollLeft;
            oldScrollPos.y = $UI.viewport.scrollTop;
            document.body.style.cursor = "grabbing";
            return;
        }
        closeMenu();
        closeSubMenu();
        e.preventDefault();
        element.style.cursor = "grabbing";
        element.style.userSelect = "none";
        draggableElements.push(element);
        element.setAttribute("dragging", '1');
        if (zoomCompensation) {
            offset.x = (e.pageX + $UI.viewport.scrollLeft)/(1+extraZoom/20) - element.offsetLeft;
            offset.y = (e.pageY + $UI.viewport.scrollTop)/(1+extraZoom/20) - element.offsetTop;
        } else {
            offset.x = e.pageX - element.offsetLeft;
            offset.y = e.pageY - element.offsetTop;
        }
        
        if (pickupElement) { pickupElement(e, offset); }     
    });

    element.addEventListener("release", function(e:CustomEvent<{event:MouseEvent}>) {
        element.style.cursor = "";
        element.style.userSelect = "";
        draggableElements.splice(draggableElements.indexOf(element), 1);
        if (dropElement) { dropElement(e.detail.event, offset); }
    } as EventListener);

    if (followMouse === true) {
        if (moveElement !== undefined) {
            element.addEventListener("followMouse", function(e:CustomEvent<{event:MouseEvent}>) {
                if (followCondition) { followCondition(doFollow, e.detail.event); }
                if (followCondition ? doFollow[0] : true) {
                    if (zoomCompensation) {
                        element.style.left = ((e.detail.event.pageX + $UI.viewport.scrollLeft)/(1+extraZoom/20) - offset.x).toString()+"px";
                        element.style.top = ((e.detail.event.pageY + $UI.viewport.scrollTop)/(1+extraZoom/20) - offset.y).toString()+"px";
                    } else {
                        element.style.left = (e.detail.event.pageX - offset.x).toString()+"px";
                        element.style.top = (e.detail.event.pageY - offset.y).toString()+"px";
                    }
                    
                    moveElement(e.detail.event, offset);
                }
            } as EventListener)
        } else {
            element.addEventListener("followMouse", function(e:CustomEvent<{event:MouseEvent}>) {
                if (followCondition) { followCondition(doFollow, e.detail.event); }
                if (followCondition ? doFollow[0] : true) {
                    if (zoomCompensation) {
                        element.style.left = ((e.detail.event.pageX + $UI.viewport.scrollLeft)/(1+extraZoom/20) - offset.x).toString()+"px";
                        element.style.top = ((e.detail.event.pageY + $UI.viewport.scrollTop)/(1+extraZoom/20) - offset.y).toString()+"px";
                    } else {
                        element.style.left = (e.detail.event.pageX - offset.x).toString()+"px";
                        element.style.top = (e.detail.event.pageY - offset.y).toString()+"px";
                    }
                }
            } as EventListener)
        }    
    }
}

let draggingElement = false;
window.addEventListener("mousemove", (e) => {
    draggingElement = false;
    for (const element of draggableElements) {
        if (element.getAttribute("dragging") !== "1") { return; }
        draggingElement = true;
        element.dispatchEvent(new CustomEvent("followMouse", {
            "detail": {"event": e}
        }));
    }
    if (draggingElement) { e.preventDefault(); }
});

window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    for (const element of draggableElements) {
        if (element.getAttribute("dragging")!=="1") continue;
        element.setAttribute("dragging", '0');
        if (element.getAttribute("checkBlocker") === "true") {
            if (!CheckAntiBlockerPixel(e) && (!isDM || flag.playerMode)) {
                element.style.cursor = "";
                element.style.userSelect = "";
                draggableElements.splice(draggableElements.indexOf(element), 1);
                element.parentElement?.removeChild(element);
                element.dispatchEvent(new CustomEvent("dragcancel", {
                    "detail": {"event": e}
                }));
                return;
            }    
        }
        element.dispatchEvent(new CustomEvent("release", {"detail": {"event": e}}));
    }
});
//#endregion

//#region Custom zoom
let extraZoom = 0;
window.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey) { return; }
    e.preventDefault();
    if (e.deltaY<0) {
        extraZoom+=1;
        $UI.board.style.transform = "scale("+(1+extraZoom/20).toString()+")";
        $UI.viewport.scrollLeft = $UI.viewport.scrollLeft*((20+extraZoom)/(20+extraZoom-1));
        $UI.viewport.scrollTop = $UI.viewport.scrollTop*((20+extraZoom)/(20+extraZoom-1));
        e.preventDefault();
    }
    if (e.deltaY>0) {
        extraZoom-=1;
        $UI.board.style.transform = "scale("+(1+extraZoom/20).toString()+")";
        $UI.viewport.scrollLeft = $UI.viewport.scrollLeft/((20+extraZoom)/(20+extraZoom-1));
        $UI.viewport.scrollTop = $UI.viewport.scrollTop/((20+extraZoom)/(20+extraZoom-1));
        e.preventDefault();
    }
}, { passive: false });

let previousScrollHeight = $UI.initiativeTrackerDiv.scrollHeight;
let previousScrollTop = 0;
$UI.initiativeTrackerDiv.onscroll = () => {
    if ($UI.initiativeTrackerDiv.scrollHeight==previousScrollHeight) {
        previousScrollTop = $UI.initiativeTrackerDiv.scrollTop * window.devicePixelRatio;
    } else {
        $UI.initiativeTrackerDiv.scrollTop = previousScrollTop / window.devicePixelRatio;
        previousScrollHeight = $UI.initiativeTrackerDiv.scrollHeight;
    }
}
//#endregion

//#region Map options
$UI.startGridAligner.onclick = () => {
    if (flag.gridAlignMode) {
        const vLinePos = getChildren($UI.vAlignHandles).map((e) => Number(e.style.left.slice(0, -2))).sort((a,b) => a-b);
        const hLinePos = getChildren($UI.hAlignHandles).map((e) => Number(e.style.top.slice(0, -2))).sort((a,b) => a-b);
        const offset = {
            x: vLinePos[0],
            y: hLinePos[0],
        };
        const vLineDistances = vLinePos.slice(1).map((p, i) => p - vLinePos[i]);
        const hLineDistances = hLinePos.slice(1).map((p, i) => p - hLinePos[i]);
        const xMean = vLineDistances.reduce((p, c) => p+c, 0) / vLineDistances.length;
        const yMean = hLineDistances.reduce((p,c) => p+c, 0) / hLineDistances.length;
        const squares = {
            x: mapPreload.width / xMean,
            y: mapPreload.height / yMean,
        }
        if (!isNaN(squares.x) && offset.x && confirm(`Apply new X settings?\nX: ${squares.x} \nOffset: ${offset.x}`)) {
            socket.emit("setMapData", {x: squares.x, offsetX: offset.x});
            $UI.vAlignHandles.innerHTML = "";
        }
        if (!isNaN(squares.y) && offset.y && confirm(`Apply new Y settings?\nY: ${squares.y} \nOffset: ${offset.y}`)) {
            socket.emit("setMapData", {y: squares.y, offsetY: offset.y});
            $UI.hAlignHandles.innerHTML = "";
        }
    }
    flag.gridAlignMode = !flag.gridAlignMode;
    updateButtonColors();
}

$UI.gridColorPicker.onchange = () => {
    socket.emit("setMapData", {gridColor: $UI.gridColorPicker.value as `#${string}`});
}

$UI.systemSelect.onchange = () => {
    socket.emit("setMapData", {system: $UI.systemSelect.value});
}

$UI.mapSelect.onchange = () => {
    socket.emit("changeSelectedMap", {selectedMap: $UI.mapSelect.value})
}

$UI.createNewMapButton.onclick = () => {
    const mapName = prompt('Enter new map name:');
    if (mapName === null) { return; }
    socket.emit("createNewMap", {name: mapName});
}

$UI.mapSourceSelect.onchange = () => {
    socket.emit("setMapData", {map: $UI.mapSourceSelect.value});
}

$UI.mapYInput.onchange = () => {
    socket.emit("setMapData", {y: parseFloat($UI.mapYInput.value)});
}

$UI.mapXInput.onchange = () => {
    socket.emit("setMapData", {x: parseFloat($UI.mapXInput.value)});
}

$UI.offsetXInput.onchange = () => {
    socket.emit("setMapData", {offsetX: parseFloat($UI.offsetXInput.value)});
}

$UI.offsetYInput.onchange = () => {
    socket.emit("setMapData", {offsetY: parseFloat($UI.offsetYInput.value)});
}

$UI.diagonalTypeSelect.onchange = () => {
    socket.emit('setMapData', {diagonalMovement: $UI.diagonalTypeSelect.value});
}
//#endregion

//#region Drawing functions
function drawCanvas(skipMap?:boolean) {
    draggableElements = draggableElements.filter((el) => document.body.contains(el));
    $UI.polyBlockerHandles.innerHTML = '';
    if (!skipMap) {
        $UI.polyBlockers.setAttribute("width", mapPreload.width.toString());
        $UI.polyBlockers.setAttribute("height", mapPreload.height.toString());
        $UI.shapeMap.style.width = `${mapPreload.width}`;
        $UI.shapeMap.style.height = `${mapPreload.height}`;
        $UI.antiBlockerMap.width = mapPreload.width;
        $UI.antiBlockerMap.height = mapPreload.height;
        $UI.gridMap.width = mapPreload.width;
        $UI.gridMap.height = mapPreload.height;
        gridSize = {x: mapPreload.width/mapData.x, y: mapPreload.height/mapData.y, min:Math.min(mapPreload.width/mapData.x, mapPreload.height/mapData.y)};
        $UI.mapImage.src = mapPreload.src;
    }
    drawGrid();
    document.body.style.setProperty("--antiBlocker-color", (isDM && !flag.playerMode)?"#00000080":"#000000FF");
    document.body.style.setProperty("--blocker-color", mapData.antiBlockerOn ? ((isDM && !flag.playerMode)?"#00000080":"#000000FF") : "#00000000");
    antiBlockerContext.clearRect(0, 0, $UI.antiBlockerMap.width, $UI.antiBlockerMap.height);
    if (mapData.antiBlockerOn) { drawAntiBlocker(); }
    $UI.polyBlockers.innerHTML = '';
    $UI.blockersDiv.innerHTML = "";
    if (mapData.blockerType == 0) {
        $UI.polyBlockerHandles.style.visibility = "hidden";
        drawBlockers();
    }
    if (mapData.blockerType == 1) {
        $UI.polyBlockerHandles.style.visibility = "";
        drawPolyBlockers();
    }
    drawTokens();
    drawShapes();
    if (oldParsedData === undefined || JSON.stringify(oldParsedData.tokens) !== JSON.stringify(mapData.tokens)) {
        console.log("First time or change detected!");
        updateTracker();
    }
}

function drawShapes() {
    $UI.shapeMap.innerHTML = '';
    $UI.shapeHandles.innerHTML = "";
    for (const currentShape of mapData.drawings) {
        if (!currentShape.visible && (!isDM||flag.playerMode)) { continue; }
        switch (currentShape.shape) {
            case "circle":
                drawCircle(currentShape);
                break;
            case "square":
                drawSquare(currentShape);
                break;
            case "cone":
                currentShape.is90Deg ? draw90Cone(currentShape) : drawCone(currentShape);
                break;
            case "5ftLine":
                draw5Line(currentShape);
                break;
            case "vertexLine":
                drawVertexLine(currentShape);
                break;
        }
    }
    updateHighlights();
}

function updateHighlightedShape() {
    $UI.shapeHandles.innerHTML = "";
    for (const shape of getChildren($UI.shapeMap)) {
        shape.dispatchEvent(new Event('checkSelected'));
    }
}

function drawVertexLine(shape:Shape) {
    const vertexLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    vertexLine.style.stroke = shape.trueColor;
    vertexLine.style.strokeWidth = `${shapeWidth}`;
    vertexLine.style.fill = `none`;
    vertexLine.style.pointerEvents = 'none';
    vertexLine.setAttribute('points', shape.verts.map((point) => `${point.x},${point.y}`).join(' '));
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = `${shapeWidth*3}`;
    hitbox.style.fill = `none`;
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('points', shape.verts.map((point) => `${point.x},${point.y}`).join(' '));
    vertexLine.addEventListener('checkSelected', () => {
        if (selectedShapeId !== shape.id) { return; }
        for (const point of shape.verts) {
            const handleContainer = document.createElement("div");
            handleContainer.style.position = "absolute";
            handleContainer.style.left = point.x.toString();
            handleContainer.style.top = point.y.toString();
            const handle = document.createElement("div");
            handle.className = "shapeHandle";
            handle.draggable = true;
            handle.style.left = "-0.25vw";
            handle.style.top = "-0.25vw";
            draggableElement(handle, true, undefined, (e) => {
                if (((e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20)) === shape.x) { return; }
                if (((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20)) === shape.y) { return; }
                point.x = ((e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20));
                point.y = ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20));
                socket.emit("editDrawing", {id: shape.id, verts: shape.verts});
            }, undefined, true);
    
            handle.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                displayMenu(e, [
                    {text: "Remove vert", hasSubMenu: false, callback: () => {
                        socket.emit('removeVert', {type: 'line', id: shape.id, vertID: point.id});
                    }}
                ]);
            });
            handleContainer.appendChild(handle);
            $UI.shapeHandles.appendChild(handleContainer);
        }
    })
    hitbox.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = shape.id;
        updateHighlights();
        shapeDragOffset.x = shape.verts[0].x - ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        shapeDragOffset.y = shape.verts[0].y - ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        document.body.style.cursor = "pointer";
        movingShapeId = shape.id;
        flag.isMovingShape = true;
    });

    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Add vert", hasSubMenu: false, callback: () => {
                const vertX = (e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20);
                const vertY = (e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20);
                let previousPoint = shape.verts[0];
                for (const [i, point] of Object.entries(shape.verts)) {
                    if (i === '0') {continue;}
                    const originX = Math.min(point.x, previousPoint.x);
                    const originY = Math.min(point.y, previousPoint.y);
                    const width = Math.abs(point.x-previousPoint.x);
                    const height = Math.abs(point.y-previousPoint.y);
                    if (vertX >= originX && vertX <= (originX+width) && vertY >= originY && vertY <= (originY+height)) {
                        shape.verts.splice(Number(i), 0, {id: crypto.randomUUID(), x: vertX, y: vertY});
                        break;
                    }
                    previousPoint = point;
                }
                socket.emit("editDrawing", {id: shape.id, verts: shape.verts});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group ? shape.group.toString() : "");
                if (shapeGroupString === null) {
                    return;
                }
                if (shapeGroupString === '') {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }},
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(hitbox);
    $UI.shapeMap.appendChild(vertexLine);
}

function drawCircle(shape:Shape) {
    const trueRadius = shape.radius*gridSize.min;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.style.stroke = shape.trueColor;
    circle.style.strokeWidth = shapeWidth.toString();
    circle.style.fill = 'none';
    circle.style.pointerEvents = 'none';
    circle.setAttribute('cx', shape.x.toString());
    circle.setAttribute('cy', shape.y.toString());
    circle.setAttribute('r', trueRadius.toString());
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = (shapeWidth*3).toString();
    hitbox.style.fill = 'none';
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('cx', shape.x.toString());
    hitbox.setAttribute('cy', shape.y.toString());
    hitbox.setAttribute('r', trueRadius.toString());
    hitbox.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || shape.link) return;
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "none";
        shapeDragOffset.x = shape.x - ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        shapeDragOffset.y = shape.y - ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        document.body.style.cursor = "pointer";
        movingShapeId = shape.id;
        flag.isMovingShape = true;
    });
    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group?.toString() ?? "");
                if (shapeGroupString === null) {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }}, {text: "Edit radius", hasSubMenu: false, callback: () => {
                const currentToken = mapData.tokens.find((t) => t.id === shape.link);
                let newRange = promptNumber("Please enter the new radius", currentToken !== undefined ? (shape.radius - currentToken.size/2)*feetPerSquare : shape.radius*feetPerSquare);
                if (newRange === null || isNaN(newRange)) { return; }
                if (currentToken !== undefined) {
                    newRange = newRange/feetPerSquare + currentToken.size/2;
                } else {
                    newRange = newRange/feetPerSquare;
                }
                socket.emit("editDrawing", {radius: newRange, id: shape.id});
            }}
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(circle);
    $UI.shapeMap.appendChild(hitbox);
}

function drawSquare(shape:Shape) {
    const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    square.style.stroke = shape.trueColor;
    square.style.strokeWidth = shapeWidth.toString();
    square.style.fill = 'none';
    square.style.pointerEvents = 'none';
    square.setAttribute('width', shape.width.toString());
    square.setAttribute('height', shape.height.toString());
    square.setAttribute('x', shape.x.toString());
    square.setAttribute('y', shape.y.toString());
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = (3*shapeWidth).toString();
    hitbox.style.fill = 'none';
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('width', shape.width.toString());
    hitbox.setAttribute('height', shape.height.toString());
    hitbox.setAttribute('x', shape.x.toString());
    hitbox.setAttribute('y', shape.y.toString());
    hitbox.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "none";
        shapeDragOffset.x = shape.x - ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        shapeDragOffset.y = shape.y - ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        document.body.style.cursor = "pointer";
        movingShapeId = shape.id;
        flag.isMovingShape = true;
    });
    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group ? shape.group.toString() : "");
                if (shapeGroupString === null) {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }}
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(hitbox);
    $UI.shapeMap.appendChild(square);
}

function draw5Line(shape:Shape) {
    const linkedToken = mapData.tokens.find((t) => t.id === shape.link);
    if (linkedToken === undefined) { console.error("Could not find token linked to 5ft line!"); return; }
    const lineOrigin = {x: Math.round(shape.x + Math.cos(shape.angle)*gridSize.x*0.5*linkedToken.size), y: Math.round(shape.y + Math.sin(shape.angle)*gridSize.y*0.5*linkedToken.size)};
    const topOriginCorner = {x: Math.round(lineOrigin.x + Math.cos(shape.angle-0.5*Math.PI)*gridSize.x*0.5), y: Math.round(lineOrigin.y + Math.sin(shape.angle-0.5*Math.PI)*gridSize.y*0.5)};
    const topTargetCorner = {x: Math.round(topOriginCorner.x + Math.cos(shape.angle) * shape.range * gridSize.x), y: Math.round(topOriginCorner.y + Math.sin(shape.angle) * shape.range * gridSize.y)};
    const bottomOriginCorner = {x: Math.round(lineOrigin.x + Math.cos(shape.angle+0.5*Math.PI)*gridSize.x*0.5), y: Math.round(lineOrigin.y + Math.sin(shape.angle+0.5*Math.PI)*gridSize.y*0.5)};
    const bottomTargetCorner = {x: Math.round(bottomOriginCorner.x + Math.cos(shape.angle) * shape.range * gridSize.x), y: Math.round(bottomOriginCorner.y + Math.sin(shape.angle) * shape.range * gridSize.y)};
    const line5ft = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line5ft.style.stroke = shape.trueColor;
    line5ft.style.strokeWidth = shapeWidth.toString();
    line5ft.style.fill = 'none';
    line5ft.style.pointerEvents = 'none';
    line5ft.setAttribute('d', `M ${topOriginCorner.x},${topOriginCorner.y} L ${bottomOriginCorner.x},${bottomOriginCorner.y} L ${bottomTargetCorner.x},${bottomTargetCorner.y} L ${topTargetCorner.x},${topTargetCorner.y} Z`);
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = (3*shapeWidth).toString();
    hitbox.style.fill = 'none';
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('d', `M ${topOriginCorner.x},${topOriginCorner.y} L ${bottomOriginCorner.x},${bottomOriginCorner.y} L ${bottomTargetCorner.x},${bottomTargetCorner.y} L ${topTargetCorner.x},${topTargetCorner.y} Z`);
    hitbox.addEventListener('mousedown', (e) => {
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "none";
        if (e.button !== 0) return;
        document.body.style.cursor = "pointer";
        shapeDragOffset.x = shape.x;
        shapeDragOffset.y = shape.y;
        shapeDragStartAngle = Math.atan2((((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - shapeDragOffset.y), (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - shapeDragOffset.x));
        movingShapeId = shape.id;
        flag.isMoving5ftLine = true;
    });
    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group ? shape.group.toString() : "");
                if (shapeGroupString === null) {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }}, {text: "Edit range", hasSubMenu: false, callback: () => {
                let newRange = Number.parseFloat(prompt("Please enter the new range", (shape.range*feetPerSquare).toString()) ?? "");
                if (!isNaN(newRange)) {
                    newRange = newRange/feetPerSquare;
                    socket.emit("editDrawing", {range: newRange, id: shape.id});
                }
            }}
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(line5ft);
    $UI.shapeMap.appendChild(hitbox);
}

function drawCone(shape:Shape) {
    const angle = shape.angle;
    const linkedToken = returnToken(shape.link);
    if (linkedToken === undefined) {
        throw new Error(`Couldn't find token ${shape.link}! Cant link to shape ${shape.id}!`);
    }
    const originX = Math.round(shape.x + Math.cos(angle)*0.5*linkedToken.size*gridSize.x);
    const originY = Math.round(shape.y +  Math.sin(angle)*0.5*linkedToken.size*gridSize.y);
    const centerY = Math.round(originY + Math.sin(angle) * shape.range * gridSize.y);
    const centerX = Math.round(originX + Math.cos(angle) * shape.range * gridSize.x);
    const destX1 = Math.round(0.5*(-centerY + originY) + centerX);
    const destY1 = Math.round(0.5*(centerX - originX) + centerY);
    const destX2 = Math.round(0.5*(centerY - originY) + centerX);
    const destY2 = Math.round(0.5*(-centerX + originX) + centerY);
    const cone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cone.style.stroke = shape.trueColor;
    cone.style.strokeWidth = shapeWidth.toString();
    cone.style.fill = 'none';
    cone.style.pointerEvents = 'none';
    cone.setAttribute('d', `M ${originX},${originY} L ${destX1},${destY1} L ${destX2},${destY2} Z`);
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = (3*shapeWidth).toString();
    hitbox.style.fill = 'none';
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('d', `M ${originX},${originY} L ${destX1},${destY1} L ${destX2},${destY2} Z`);
    hitbox.addEventListener('mousedown', (e) => {
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "none";
        if (e.button !== 0) return;
        document.body.style.cursor = "pointer";
        shapeDragOffset.x = shape.x;
        shapeDragOffset.y = shape.y;
        shapeDragStartAngle = Math.atan2((((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - shapeDragOffset.y), (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - shapeDragOffset.x));
        movingShapeId = shape.id;
        flag.isMovingCone = true;
    });
    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group ? shape.group.toString() : "");
                if (shapeGroupString === null) {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }}, {text: "Edit range", hasSubMenu: false, callback: () => {
                let newRange = Number.parseFloat(prompt("Please enter the new range", (shape.range*feetPerSquare).toString()) ?? "");
                if (!isNaN(newRange)) {
                    newRange = newRange/feetPerSquare;
                    socket.emit("editDrawing", {range: newRange, id: shape.id});
                }
            }}
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(cone);
    $UI.shapeMap.appendChild(hitbox);
}

function draw90Cone(shape:Shape) {
    const angle = shape.angle;
    const linkedToken = returnToken(shape.link);
    if (linkedToken === undefined) {
        throw new Error(`Couldn't find token ${shape.link}! Cant link to shape ${shape.id}!`);
    }
    const originX = Math.round(shape.x + Math.cos(angle)*0.5*linkedToken.size*gridSize.x);
    const originY = Math.round(shape.y +  Math.sin(angle)*0.5*linkedToken.size*gridSize.y);
    const destX1 = Math.round(originX + Math.cos(angle+0.25*Math.PI) * shape.range * gridSize.x);
    const destY1 = Math.round(originY + Math.sin(angle+0.25*Math.PI) * shape.range * gridSize.y);
    const destX2 = Math.round(originX + Math.cos(angle-0.25*Math.PI) * shape.range * gridSize.x);
    const destY2 = Math.round(originY + Math.sin(angle-0.25*Math.PI) * shape.range * gridSize.y);
    const extendedRange = Math.sqrt(Math.pow(destX1 - originX, 2) + Math.pow(destY1 - originY, 2));
    const cone90 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cone90.style.stroke = shape.trueColor;
    cone90.style.strokeWidth = shapeWidth.toString();
    cone90.style.fill = 'none';
    cone90.style.pointerEvents = 'none';
    cone90.setAttribute('d', `M ${originX},${originY} L ${destX1},${destY1} A ${extendedRange},${extendedRange} 0 0,0 ${destX2},${destY2} Z`);
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.style.stroke = '#00000001';
    hitbox.style.strokeWidth = (3*shapeWidth).toString();
    hitbox.style.fill = 'none';
    hitbox.style.pointerEvents = 'painted';
    hitbox.setAttribute('d', `M ${originX},${originY} L ${destX1},${destY1} A ${extendedRange},${extendedRange} 0 0,0 ${destX2},${destY2} Z`);
    hitbox.addEventListener('mousedown', (e) => {
        selectedToken = '0-0-0-0-0';
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "none";
        if (e.button !== 0) return;
        document.body.style.cursor = "pointer";
        shapeDragOffset.x = shape.x;
        shapeDragOffset.y = shape.y;
        shapeDragStartAngle = Math.atan2((((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - shapeDragOffset.y), (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - shapeDragOffset.x));
        movingShapeId = shape.id;
        flag.isMovingCone = true;
    });
    hitbox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenuList:ContextMenuOption[] = [
            {text: "Erase shape", hasSubMenu: false, callback: () => {
                socket.emit("removeDrawing", {id: shape.id});
            }},
            {text: "Set shape group", hasSubMenu: false, callback: () => {
                const shapeGroupString = prompt("Enter shape group number: ", shape.group ? shape.group.toString() : "");
                if (shapeGroupString === null) {
                    socket.emit("editDrawing", {id: shape.id, group: null});
                    return;
                }
                const group = parseInt(shapeGroupString);
                if (!isNaN(group)) {
                    socket.emit("editDrawing", {id: shape.id, group: group});
                }
            }}, {text: "Edit range", hasSubMenu: false, callback: () => {
                let newRange = Number.parseFloat(prompt("Please enter the new range", (shape.range*feetPerSquare).toString()) ?? "");
                if (!isNaN(newRange)) {
                    newRange = newRange/feetPerSquare;
                    socket.emit("editDrawing", {range: newRange, id: shape.id});
                }
            }}
        ];
        if (isDM) {
            contextMenuList.push({text: shape.visible?"Hide shape":"Reveal shape", hasSubMenu: false, callback: () => {
                socket.emit("editDrawing", {id: shape.id, visible: !shape.visible});
            }});
        }
        displayMenu(e, contextMenuList);
    });
    $UI.shapeMap.appendChild(cone90);
    $UI.shapeMap.appendChild(hitbox);
}

function drawPolyBlockers() {
    if (flag.isDraggingBlocker) { return; }
    for (const currentPolyBlocker of mapData.polyBlockers) {
        const newPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon') as unknown as HTMLElement;
        newPolygon.style.position = "absolute";
        newPolygon.setAttribute("points", currentPolyBlocker.verts.map((v) => `${v.x},${v.y}`).join(' '));
        newPolygon.setAttribute("class", "polyBlocker");
        newPolygon.addEventListener('checkSelected', () => {
            if (currentPolyBlocker.id !== selectedBlocker) {
                if (currentPolyBlocker.inactive && isDM && !flag.playerMode) {
                    newPolygon.style.stroke = "red";
                    newPolygon.style.strokeDasharray = "4";
                } else {
                    newPolygon.style.stroke = "";
                    newPolygon.style.strokeDasharray = "";
                }
                return;
            }
            newPolygon.style.stroke = "violet";
            newPolygon.style.strokeDasharray = "4";
            for (const vert of currentPolyBlocker.verts) {
                const editHandleContainer = document.createElement("div");
                editHandleContainer.style.position = "absolute";
                editHandleContainer.style.left = vert.x.toString();
                editHandleContainer.style.top = vert.y.toString();
                editHandleContainer.title = currentPolyBlocker.verts.indexOf(vert).toString();
                const editHandle = document.createElement("div");
                editHandle.className = "polyBlockerHandle";
                editHandle.style.left = "-0.35vw";
                editHandle.style.top = "-0.35vw";
                
                draggableElement(editHandle, true, undefined, (e) => {
                    socket.emit("editVert", {id: selectedBlocker, vertID: vert.id, x: ((e.pageX + $UI.viewport.scrollLeft)/(1+extraZoom/20)), y: ((e.pageY + $UI.viewport.scrollTop)/(1+extraZoom/20))});
                })
                editHandle.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    const menuOptions = [
                        {text: "Add new vert", hasSubMenu: false, callback: () => {
                            socket.emit("addVert", {id: currentPolyBlocker.id, vertID: vert.id});
                            updateHighlights();
                        }},
                        {text: "Remove vert", hasSubMenu: false, callback: () => {
                            if (currentPolyBlocker.verts.length>3) {
                                socket.emit("removeVert", {type:'blocker', id: currentPolyBlocker.id, vertID: vert.id});
                            } else {
                                alert("There are too few verts in that poly blocker to remove one!");
                            }
                        }}
                    ];
                    displayMenu(e, menuOptions);
                });
                editHandleContainer.appendChild(editHandle);
                $UI.polyBlockerHandles.appendChild(editHandleContainer);
            }
        });
        
        if (!mapData.antiBlockerOn && !currentPolyBlocker.inactive) {
            antiBlockerContext.beginPath();
            antiBlockerContext.fillStyle = document.body.style.getPropertyValue("--antiBlocker-color");
            antiBlockerContext.moveTo(currentPolyBlocker.verts[0].x, currentPolyBlocker.verts[0].y);
            for (const vert of currentPolyBlocker.verts) {
                antiBlockerContext.lineTo(vert.x, vert.y);
            }
            antiBlockerContext.fill('nonzero');
        }

        $UI.polyBlockers.appendChild(newPolygon);
        if (!isDM || flag.playerMode) {
            if (currentPolyBlocker.inactive) {
                newPolygon.style.pointerEvents = "none";
                continue;
            }
            if (mapData.antiBlockerOn) {
                newPolygon.style.pointerEvents = "none";
                continue;
            }
            
            newPolygon.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            });

            draggableElement(newPolygon, false, (e) => {
                flag.isPanning = true;
                oldMousePos.x = e.pageX;
                oldMousePos.y = e.pageY;
                oldScrollPos.x = $UI.viewport.scrollLeft;
                oldScrollPos.y = $UI.viewport.scrollTop;
                document.body.style.cursor = "grabbing";
            }, () => {
                document.body.style.cursor = "";
            });
            continue;
        }

        if (!flag.blockerEditMode || flag.quickPolyBlockerMode) {
            newPolygon.style.pointerEvents = "none"; 
            continue;
        }

        newPolygon.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        draggableElement(newPolygon, true, (e) => {
            selectedBlocker = currentPolyBlocker.id;
            selectedToken = '0-0-0-0-0';
            selectedShapeId = '0-0-0-0-0';
            polyDragOffset.x = ((e.pageX+ $UI.viewport.scrollLeft)/(1+extraZoom/20));
            polyDragOffset.y = ((e.pageY + $UI.viewport.scrollTop)/(1+extraZoom/20));
            updateHighlights();
        }, (e) => {
            const moveX = -polyDragOffset.x + ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
            const moveY = -polyDragOffset.y + ((e.pageY+ $UI.viewport.scrollTop)/(1+extraZoom/20));
            if (moveX!=0 && moveY!=0) {
                socket.emit("movePolyBlocker", {id: currentPolyBlocker.id, offsetX: moveX, offsetY: moveY});
            }
        }, (e) => {
            newPolygon.setAttribute("transform", "matrix(1,0,0,1,"+(-polyDragOffset.x + ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))).toString()+", "+(-polyDragOffset.y + ((e.pageY+ $UI.viewport.scrollTop)/(1+extraZoom/20))).toString()+")");
        });

        newPolygon.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const menuOptions = [
                {text: currentPolyBlocker.inactive ? "Activate" : "Deactivate", hasSubMenu: false, callback: () => {
                    socket.emit("togglePolyBlocker", {id: currentPolyBlocker.id});
                }},
                {text: "Remove blocker", hasSubMenu: false, callback: () => {
                    selectedBlocker = '0-0-0-0-0';
                    socket.emit("removePolyBlocker", {id: currentPolyBlocker.id});
                }}
            ];
            displayMenu(e, menuOptions);
        });
    }
    updateHighlights();
}

function drawBlockers() {
    if (flag.isDraggingBlocker) { return; }
    for (const currentBlocker of mapData.blockers) {
        const tmpBlocker = document.createElement("div");
        const extraBlocker = document.createElement("div");
        tmpBlocker.className = "blocker";
        tmpBlocker.style.left = currentBlocker.x + "px";
        tmpBlocker.style.top = currentBlocker.y + "px";
        tmpBlocker.style.width = currentBlocker.width + "px";
        tmpBlocker.style.height = currentBlocker.height + "px";
        tmpBlocker.addEventListener('checkSelected', () => {
            if (flag.blockerEditMode) {
                tmpBlocker.style.outline = currentBlocker.id==selectedBlocker ? `0.3vh dashed ${blockerOutlineColor}` : '';
                tmpBlocker.style.zIndex = currentBlocker.id==selectedBlocker ? '1002' : '1001';
            } else {
                tmpBlocker.style.zIndex = '';
                tmpBlocker.style.outline = '';
            }
        })
        if (!mapData.antiBlockerOn) {
            antiBlockerContext.beginPath();
            antiBlockerContext.fillStyle = document.body.style.getPropertyValue("--antiBlocker-color");
            antiBlockerContext.fillRect(currentBlocker.x, currentBlocker.y, currentBlocker.width, currentBlocker.height);
        }
        tmpBlocker.appendChild(extraBlocker);
        $UI.blockersDiv.appendChild(tmpBlocker);
        if (!isDM || flag.playerMode) {
            tmpBlocker.addEventListener("contextmenu", (e) => { e.preventDefault(); })

            tmpBlocker.addEventListener("mousedown", (e) => {
                if (e.button !== 0) { return; }
                flag.isPanning = true;
                oldMousePos.x = (e.pageX/(1+extraZoom/20));
                oldMousePos.y = (e.pageY/(1+extraZoom/20));
                oldScrollPos.x =$UI.viewport.scrollLeft;
                oldScrollPos.y =$UI.viewport.scrollTop;
                document.body.style.cursor = "grabbing";
            });

            tmpBlocker.addEventListener("mousemove", (e) => {
                if (!flag.isPanning) { return; }
                $UI.viewport.scrollLeft = oldScrollPos.x - ((e.pageX/(1+extraZoom/20)) - oldMousePos.x);
                $UI.viewport.scrollTop = oldScrollPos.y - ((e.pageY/(1+extraZoom/20)) - oldMousePos.y);
            });

            if (mapData.antiBlockerOn) {
                extraBlocker.style.pointerEvents="none";
                tmpBlocker.style.pointerEvents="none";
                continue;
            }
            extraBlocker.style.userSelect = "none";
            tmpBlocker.style.userSelect = "none";
            extraBlocker.draggable = false;
            tmpBlocker.draggable = false;
            continue;
        }
        extraBlocker.style.width = currentBlocker.width + "px";
        extraBlocker.style.height = currentBlocker.height + "px";
        if (!flag.blockerEditMode || flag.isPlacingBlocker) {
            extraBlocker.style.pointerEvents="none";
            tmpBlocker.style.pointerEvents="none";
            continue;
        }
        extraBlocker.draggable = true;
        tmpBlocker.style.resize = "both";
        tmpBlocker.addEventListener("mousedown", (e) => {
            if (e.button !== 0) { return; }
            selectedBlocker = currentBlocker.id;
            selectedToken = '0-0-0-0-0';
            selectedShapeId = '0-0-0-0-0';
            updateHighlights();
            drawShapes();
        });

        tmpBlocker.addEventListener("dragover", (e) => { e.preventDefault(); });

        tmpBlocker.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            selectedBlocker = currentBlocker.id;
            selectedToken = '0-0-0-0-0';
            selectedShapeId = '0-0-0-0-0';
            updateHighlights();
            displayMenu(e, [{text: "Remove blocker", hasSubMenu: false, callback: () => {
                selectedBlocker = '0-0-0-0-0';
                socket.emit("removeBlocker", {id: currentBlocker.id});
            }}]);
        });

        tmpBlocker.addEventListener("mouseup", (e) => {
            if (e.button !== 0) { return; }
            flag.isDraggingBlocker = false;
            extraBlocker.style.width = currentBlocker.width + "px";
            extraBlocker.style.height = currentBlocker.height + "px";
            if (currentBlocker.width === tmpBlocker.offsetWidth || currentBlocker.height === tmpBlocker.offsetHeight) { return; }
            socket.emit("editBlocker", {id: currentBlocker.id, x: currentBlocker.x, y: currentBlocker.y, width: tmpBlocker.offsetWidth, height: tmpBlocker.offsetHeight});
        });

        extraBlocker.addEventListener("dragstart", (e) => {
            flag.isDraggingBlocker = true;
            blockerDragOffset.x = currentBlocker.x - ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
            blockerDragOffset.y = currentBlocker.y - ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        })

        extraBlocker.addEventListener("dragend", (e) => {
            e.preventDefault();
            if (!flag.isDraggingBlocker) { return; }
            flag.isDraggingBlocker = false;
            const newX = draggedBlocker.x + blockerDragOffset.x;
            const newY = draggedBlocker.y + blockerDragOffset.y;
            if (newX === currentBlocker.x || newY === currentBlocker.y) { return; }
            socket.emit("editBlocker", {id: currentBlocker.id, x: newX, y: newY, width: tmpBlocker.offsetWidth, height: tmpBlocker.offsetHeight});
        })
    }
}

function updateHighlightedBlocker() {
    $UI.polyBlockerHandles.innerHTML = "";
    for (const poly of getChildren($UI.polyBlockers)) {
        poly.dispatchEvent(new Event('checkSelected'));
    }

    for (const blocker of getChildren($UI.blockersDiv)) {
        blocker.dispatchEvent(new Event('checkSelected'));
    }
}

function drawAntiBlocker() {
    switch (mapData.blockerType) {
        case 0:
            antiBlockerContext.fillStyle = document.body.style.getPropertyValue("--antiBlocker-color");
            antiBlockerContext.fillRect(0, 0, mapPreload.width, mapPreload.height);
            antiBlockerContext.globalCompositeOperation = "destination-out";
            for (const blocker of mapData.blockers) {
                antiBlockerContext.fillStyle = "#FFFFFFFF";
                antiBlockerContext.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
            }
            antiBlockerContext.globalCompositeOperation = "source-over";
            break;

        case 1:
            antiBlockerContext.fillStyle = document.body.style.getPropertyValue("--antiBlocker-color");
            antiBlockerContext.fillRect(0, 0, mapPreload.width, mapPreload.height);
            antiBlockerContext.globalCompositeOperation = "destination-out";
            for (const polyBlocker of mapData.polyBlockers) {
                if (polyBlocker.inactive) { continue; }
                antiBlockerContext.beginPath();
                antiBlockerContext.fillStyle = "#FFFFFFFF";
                antiBlockerContext.moveTo(polyBlocker.verts[0].x, polyBlocker.verts[0].y);
                for (const vert of polyBlocker.verts) {
                    antiBlockerContext.lineTo(vert.x, vert.y);
                }
                antiBlockerContext.fill();
            }
            antiBlockerContext.globalCompositeOperation = "source-over";
            break;
    }
}

function drawGrid() {
    gridCanvas.strokeStyle = GridColor;
    gridCanvas.lineWidth = GridLineWidth;
    gridCanvas.clearRect(0, 0, mapPreload.width, mapPreload.height);
    gridCanvas.beginPath();
    if (!gridActive) { return; }
    for (let x = -Math.round(mapPreload.width/gridSize.x); x <= Math.round(mapPreload.width/gridSize.x); x++) {
        gridCanvas.moveTo(x * gridSize.x + offsetX + 0.5, 0);
        gridCanvas.lineTo(x * gridSize.x + offsetX + 0.5, mapPreload.height);
    }    
    for (let y = -Math.round(mapPreload.height/gridSize.y); y <= Math.round(mapPreload.height/gridSize.y); y++) {
        gridCanvas.moveTo(0, y * gridSize.y + offsetY + 0.5);
        gridCanvas.lineTo(mapPreload.width, y * gridSize.y + offsetY + 0.5);
    }
    gridCanvas.stroke();
}

function LoadTokenData(token:Token, force?:boolean) {
    if (!CheckTokenPermission(token)) {
        $UI.detailsIcon.src = "public/blankToken.png";
        $UI.nameInput.value = "DM only!";
        $UI.maxHpInput.value = "";
        $UI.currentHpInput.value = "";
        $UI.statusInput.value = token.status ?? '';
        $UI.initiativeInput.value = "";
        $UI.groupIdInput.value = "";
        $UI.acInput.value = "";
        $UI.mentalDef.value = "";
        $UI.physicalDef.value = "";
        $UI.refDef.value = "";
        $UI.fortDef.value = "";
        $UI.willDef.value = "";
        $UI.noteArea.value = "";
        $UI.notesBoxTextArea.value = "";
        DetailsToggleButtonsUpdate(false, false);
        return;
    }
    notesTargetToken = token.id;
    if (!token.image) {
        $UI.detailsIcon.src = 'public/blankToken.png';
    } else if (mapData.tokenList.includes(token.image)) {
        $UI.detailsIcon.src = `public/tokens/${token.image}`;
    } else if (mapData.dmTokenList.includes(token.image)) {
        $UI.detailsIcon.src = `public/dmTokens/${token.image}`;
    } else {
        $UI.detailsIcon.src = "public/blankToken.png";
    }

    if (document.activeElement!=$UI.nameInput || force) { $UI.nameInput.value = token.name ?? ""; }
    if (document.activeElement!=$UI.noteArea || force) { $UI.noteArea.value = token.notes ?? ""; }
    if (document.activeElement!=$UI.notesBoxTextArea || force) { $UI.notesBoxTextArea.value = token.notes ?? ""; }
    if (document.activeElement!=$UI.initiativeInput || force) { $UI.initiativeInput.value = token.initiative?.toString() ?? ""; }
    if (document.activeElement!=$UI.acInput || force) { $UI.acInput.value = token.ac?.toString() ?? ""; }
    if (document.activeElement!=$UI.mentalDef || force) { $UI.mentalDef.value = token.mentalDef?.toString() ?? ""; }
    if (document.activeElement!=$UI.physicalDef || force) { $UI.physicalDef.value = token.physicalDef?.toString() ?? ""; }
    if (document.activeElement!=$UI.refDef || force) { $UI.refDef.value = token.refDef?.toString() ?? ""; }
    if (document.activeElement!=$UI.fortDef || force) { $UI.fortDef.value = token.fortDef?.toString() ?? ""; }
    if (document.activeElement!=$UI.willDef || force) { $UI.willDef.value = token.willDef?.toString() ?? ""; }
    if (document.activeElement!=$UI.statusInput || force) { $UI.statusInput.value = token.status ?? ""; }
    if (document.activeElement!=$UI.groupIdInput || force) { $UI.groupIdInput.value = token.group?.toString() ?? ""; }
    if ((document.activeElement!=$UI.currentHpInput && document.activeElement!=$UI.maxHpInput) || force) {
        $UI.currentHpInput.value = token.hp?.split("/")[0] ?? "";
        $UI.maxHpInput.value = token.hp?.split("/")[1] ?? "";
    }
    DetailsToggleButtonsUpdate(token.concentrating, token.hideTracker);
}

function drawTokens() {
    $UI.tokensDiv.innerHTML = "";
    for (const token of mapData.tokens) {
        if (token.hidden && (!isDM || flag.playerMode)) { continue; }
        drawToken(token);
    }
}

function refreshToken(token:Token, oldContainer:HTMLElement) {
    oldContainer.parentElement?.removeChild(oldContainer);
    drawToken(token);
}

function drawToken(token:Token) {
    const tokenContainer = document.createElement('div');
    tokenContainer.style.top = `${token.y - (gridSize.y*token.size)/2}px`;
    tokenContainer.style.left = `${token.x - (gridSize.x*token.size)/2}px`;
    tokenContainer.style.width = `${token.size*gridSize.x - GridLineWidth}px`;
    tokenContainer.style.height = `${token.size*gridSize.y - GridLineWidth}px`;
    tokenContainer.style.position = "absolute";
    tokenContainer.style.zIndex = `${Math.floor(token.layer*10) + baseTokenIndex}`;
    tokenContainer.id = token.id;

    const imageElement = document.createElement("img");
    imageElement.style.zIndex = `${Math.floor(token.layer*10) + baseTokenIndex}`;
    imageElement.className = "position-absolute w-100 h-100";
    if (!token.image) {
        imageElement.src = 'public/blankToken.png';
    } else if (mapData.tokenList.includes(token.image)) {
        imageElement.src = `public/tokens/${token.image}`;
    } else if (mapData.dmTokenList.includes(token.image)) {
        imageElement.src = `public/dmTokens/${token.image}`;
    } else {
        imageElement.src = "public/blankToken.png";
    }
    imageElement.title = token.status ?? '';
    tokenContainer.appendChild(imageElement);

    if (flag.isPlacingCone || flag.isPlacingLine || flag.isPlacingSquare || flag.isDraggingBlocker || flag.quickPolyBlockerMode) { tokenContainer.style.pointerEvents = "none"; }

    tokenContainer.addEventListener("mousemove", (e) => {
        if (!flag.isPanning) { return; }
        $UI.viewport.scrollLeft = oldScrollPos.x - ((e.pageX/(1+extraZoom/20)) - oldMousePos.x);
        $UI.viewport.scrollTop = oldScrollPos.y - ((e.pageY/(1+extraZoom/20)) - oldMousePos.y);
    })

    tokenContainer.addEventListener("dragover", (e) => { e.preventDefault(); })

    $UI.tokensDiv.appendChild(tokenContainer);

    if (token.id === selectedToken) {
        LoadTokenData(token);
        updateHighlights();
    }

    let textHolder:HTMLDivElement;
    if (!token.image) {
        textHolder = document.createElement("div");
        textHolder.innerText = token.text;
        textHolder.className = "position-absolute top-50 start-50 translate-middle text-nowrap font-monospace text-dark";
        textHolder.style.zIndex = `${Math.floor(token.layer*10) + baseTokenIndex + 1}`;
        tokenContainer.appendChild(textHolder);
        textHolder.style.fontSize = `${Math.min(tokenContainer.offsetWidth, tokenContainer.offsetHeight)/token.text.length}`
    }

    let hiddenImage:HTMLImageElement;
    if (token.hidden) {
        hiddenImage = document.createElement("img");
        hiddenImage.src = "images/hidden.png";
        hiddenImage.className = "position-absolute top-0 start-0";
        hiddenImage.style.width = ((token.size * gridSize.x-GridLineWidth) / 3).toString() + "px";
        hiddenImage.style.height = ((token.size * gridSize.y-GridLineWidth) / 3).toString() + "px";
        hiddenImage.style.zIndex = (Math.floor(token.layer*10) + baseTokenIndex + 1).toString();
        tokenContainer.appendChild(hiddenImage);
    }    
    
    let concentratingIcon:HTMLImageElement;
    if (token.concentrating && (!token.dm || (isDM&&!flag.playerMode))) {
        concentratingIcon = document.createElement("img");
        concentratingIcon.className = "position-absolute bottom-0 start-0";
        concentratingIcon.src = "images/literally_copyright.png";
        tokenContainer.appendChild(concentratingIcon);
        concentratingIcon.style.width = ((token.size * gridSize.x-GridLineWidth) / 3).toString() + "px";
        concentratingIcon.style.height = ((token.size * gridSize.y-GridLineWidth) / 3).toString() + "px";
        concentratingIcon.style.zIndex = (Math.floor(token.layer*10) + baseTokenIndex + 1).toString();
    }

    tokenContainer.addEventListener("contextmenu", (e) => {
        closeMenu();
        closeSubMenu();
        e.preventDefault();
        if (!CheckAntiBlockerPixel(e) && (!isDM || flag.playerMode)) { return; }
        const menuOptions:ContextMenuOption[] = [{text: "Draw Shape", hasSubMenu: true, callback: () => {
            const subMenuOptions = [
                {text: "Draw Circle", callback: () => {
                    const radiusInput = promptNumber("Please enter the desired radius in feet for your circle(s)");
                    if (radiusInput === null || isNaN(radiusInput)) { return; }
                    circleMarkers.radius = (radiusInput + (feetPerSquare / 2) * token.size) / feetPerSquare;
                    socket.emit("addDrawing", {shape: "circle", link: token.id, x: token.x, y: token.y, radius: circleMarkers.radius, trueColor: shapeColor, visible: isDM ? confirm("Should the shape be visible?") : true});
                    closeMenu();
                    closeSubMenu();
                }},
                {text: "Draw Cone", callback: () => {
                    const rangeInput = promptNumber("Please enter the desired range in feet for your cone");
                    if (rangeInput === null || isNaN(rangeInput)) { return; }
                    coneMarkers.is90Deg = false;
                    coneMarkers.x = token.x;
                    coneMarkers.y = token.y;
                    coneMarkers.range = rangeInput / feetPerSquare;
                    coneMarkers.linkId = token.id;
                    flag.isPlacingCone = true;
                    drawCanvas();
                }},
                {text: "Draw 90° Cone", callback: () => {
                    const rangeInput = promptNumber("Please enter the desired range in feet for your cone");
                    if (rangeInput === null || isNaN(rangeInput)) { return; }
                    coneMarkers.is90Deg = true;
                    coneMarkers.x = token.x;
                    coneMarkers.y = token.y;
                    coneMarkers.range = rangeInput / feetPerSquare;
                    coneMarkers.linkId = token.id;
                    flag.isPlacingCone = true;
                    drawCanvas();
                }},
                {text: "Draw 5ft wide Line", callback: () => {
                    const rangeInput = promptNumber("Please enter the desired range of the line in feet.\nThen click where you want to aim.");
                    if (rangeInput === null || isNaN(rangeInput)) { return; }
                    thickLineMarkers.range = rangeInput / feetPerSquare;
                    thickLineMarkers.x = token.x;
                    thickLineMarkers.y = token.y;
                    thickLineMarkers.linkId = token.id;
                    flag.isPlacing5ftLine = true;
                    drawCanvas();
                }}
            ];
            displaySubMenu(e, subMenuOptions);
        }}];
        if ((token.dm && isDM) || !token.dm) {
            menuOptions.unshift({text: "Delete token", hasSubMenu: false, callback: () => {
                socket.emit("removeToken", {id: token.id});
                if (token.id !== selectedToken) { return; }
                $UI.initiativeInput.value = "";
                $UI.nameInput.value = "";
                $UI.acInput.value = "";
                $UI.mentalDef.value = "";
                $UI.physicalDef.value = "";
                $UI.refDef.value = "";
                $UI.fortDef.value = "";
                $UI.willDef.value = "";
                $UI.currentHpInput.value = "";
                $UI.maxHpInput.value = "";
                $UI.statusInput.value = "";
                $UI.groupIdInput.value = "";
                selectedToken = '0-0-0-0-0';
                DetailsToggleButtonsUpdate(false, false);
            }});

            menuOptions.push({text: "Edit token", hasSubMenu: true, callback: () => {
                const subMenuOptions = [
                    {text: "Change size", callback: () => {
                        const tokenSize = promptNumber("Please enter the new size of the token");
                        if (tokenSize === null || isNaN(tokenSize)) { return; }
                        if (tokenSize <= 0 || (!isDM && tokenSize > 6)) { alert("The desired size is too large or invalid"); return; }
                        socket.emit("editToken", {id: token.id, size: tokenSize, layer: token.layer + token.size - tokenSize});
                    }},
                    {text: "Change layer", callback: () => {
                        const newLayer = promptInteger("Please enter the new layer", token.layer);
                        if (newLayer === null || isNaN(newLayer)) { return; }
                        if (newLayer<=0 || newLayer>499) { alert("Layer must be > 0 and < 500 "); return; }
                        socket.emit("editToken", {id: token.id, layer: newLayer});
                    }}
                ];
                if (token.text != null) {
                    subMenuOptions.push({text: "Edit text", callback: () => {
                        const newText = prompt("Please enter the new text for the token:", token.text);
                        if (newText===null) { return; }
                        socket.emit("editToken", {id: token.id, text: newText});
                    }});
                }
                if (isDM) {
                    subMenuOptions.push({text: "Toggle DM only", callback: () => {
                        socket.emit("editToken", {id: token.id, dm: !token.dm});
                    }});
                }
                displaySubMenu(e, subMenuOptions);
            }});

            menuOptions.push({text: "Change image", hasSubMenu: true, callback: () => {
                const subMenu = [];
                subMenu.push({text: "Text", callback: () => {
                    socket.emit("editToken", {id: token.id, image: "", text: token.text?token.text:"Text"});
                }});
                for (const image of mapData.tokenList) {
                    subMenu.push({text: image.substring(0, image.length - 4), callback: () => {
                        socket.emit("editToken", {id: token.id, image: image});
                    }});
                }
                if (isDM) {
                    for (const image of mapData.dmTokenList) {
                        subMenu.push({text: image.substring(0, image.length - 4), callback: () => {
                            socket.emit("editToken", {id: token.id, image: image});
                        }});
                    }
                }
                displaySubMenu(e, subMenu);
            }});
        }
        
        if (isDM) {
            menuOptions.push({text: token.hidden ? "Reveal token" : "Hide token", hasSubMenu: false, callback: () => {
                socket.emit("setTokenHidden", {id: token.id, hidden: !token.hidden});
            }});
            if (token.group !== undefined) {
                menuOptions.push({text: "Group options", hasSubMenu: true, callback: () => {
                    const subMenuOptions = [{text: "Hide tokens", callback: () => {
                            for (const tmpToken of mapData.tokens) {
                                if (tmpToken.group == token.group) {
                                    socket.emit("setTokenHidden", {id: tmpToken.id, hidden: true});
                                }
                            }
                        }},
                        {text: "Reveal tokens", callback: () => {
                            for (const tmpToken of mapData.tokens) {
                                if (tmpToken.group == token.group) {
                                    socket.emit("setTokenHidden", {id: tmpToken.id, hidden: false});
                                }
                            }
                        }},
                        {text: "Hide trackers", callback: () => {
                            for (const tmpToken of mapData.tokens) {
                                if (tmpToken.group == token.group) {
                                    socket.emit("editToken", {id: tmpToken.id, hideTracker: true});
                                }
                            }
                            
                        }},
                        {text: "Show trackers", callback: () => {
                            for (const tmpToken of mapData.tokens) {
                                if (tmpToken.group == token.group) {
                                    socket.emit("editToken", {id: tmpToken.id, hideTracker: false});
                                }
                            }
                            
                        }},
                        {text: "Toggle DM only", callback: () => {
                            for (const tmpToken of mapData.tokens) {
                                if (tmpToken.group == token.group) {
                                    socket.emit("editToken", {id: tmpToken.id, dm: !token.dm});
                                }
                            }
                        }}
                    ];
                    displaySubMenu(e, subMenuOptions);
                }});
            }
        }
        displayMenu(e, menuOptions);
    });

    draggableElement(tokenContainer, true, (e) => {
        if (e.ctrlKey || e.metaKey) { flag.controlPressed = true; }
        selectedToken = token.id;
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        $UI.detailsScreen.style.display = "";
        imageElement.style.opacity = "0.7";
        if (concentratingIcon) { concentratingIcon.style.opacity = "0.7"; }   
        if (textHolder) { textHolder.style.opacity = "0.7"; }
        if (hiddenImage) { hiddenImage.style.opacity = "0.7"; }
        flag.isPanning = false;
    }, (e, offset) => {
        if (flag.isPanning) {
            flag.controlPressed = false;
            document.body.style.cursor = "";
            return;
        }
        const zoomAdjustedPos = {
            x: (e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20),
            y: (e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20),
        }
        const tokenCenter = {
            x: 0.5 * gridSize.x * token.size,
            y: 0.5 * gridSize.y * token.size,
        }
        if (!gridSnap) {
            const tempx = zoomAdjustedPos.x - offset.x + tokenCenter.x;
            const tempy = zoomAdjustedPos.y - offset.y + (token.size * gridSize.y)/2;
            if (tempx === token.x && tempy === token.y) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
            if (!CheckAntiBlockerPixelPosition(tempx, tempy) && (!isDM || flag.playerMode)) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
            if (tempx < 0 || tempy < 0 || tempx > $UI.mapImage.offsetWidth || tempy > $UI.mapImage.offsetHeight) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
            socket.emit("moveToken", {id: token.id, x: tempx, y: tempy, bypassLink: !flag.controlPressed});
            flag.controlPressed = false;
            return;
        }
        let tX;
        let tY;
        if (token.size >= 1) {
            tX = Math.round((zoomAdjustedPos.x - offset.x - mapData.offsetX)/gridSize.x) * gridSize.x + tokenCenter.x + offsetX + GridLineWidth;
            tY = Math.round((zoomAdjustedPos.y - offset.y - mapData.offsetY)/gridSize.y) * gridSize.y + tokenCenter.y + offsetY + GridLineWidth;
        } else {
            tX = Math.round((zoomAdjustedPos.x - mapData.offsetX - tokenCenter.x) / (gridSize.x * token.size)) * (gridSize.x * token.size) + tokenCenter.x + offsetX + GridLineWidth;
            tY = Math.round((zoomAdjustedPos.y - mapData.offsetY - tokenCenter.y) / (gridSize.y * token.size)) * (gridSize.y * token.size) + tokenCenter.y + offsetY + GridLineWidth;
        }
        
        if (tX === token.x && tY === token.y) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
        if (!CheckAntiBlockerPixelPosition(tX, tY) && (!isDM || flag.playerMode)) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
        if (tX < 0 || tY < 0 || tX > $UI.mapImage.offsetWidth || tY > $UI.mapImage.offsetHeight) { flag.controlPressed = false; refreshToken(token, tokenContainer); return; }
        socket.emit("moveToken", {id: token.id, x: tX, y: tY, bypassLink: !flag.controlPressed});
        flag.controlPressed = false;
    }, undefined, true, (doFollow) => {
        doFollow[0] = !flag.isPanning;
    });
    tokenContainer.addEventListener('dragcancel', () => {
        refreshToken(token, tokenContainer);
    })
}

function updateHighlightedToken() {
    for (const token of getChildren($UI.tokensDiv)) {
        token.style.outline = token.id===selectedToken?"0.15vw dashed aqua":"";
    }       
}

let previousInitiativeTrackerScrollPosition = 0;
function updateTracker() {
    previousInitiativeTrackerScrollPosition = $UI.initiativeTrackerDiv.scrollTop;
    $UI.initiativeTrackerDiv.innerHTML = "";
    for (const token of mapData.tokens) {
        if (CheckTokenPermission(token) && !token.hideTracker) {
            if ($UI.initSearch.value!="") {
                if (token.name ? (token.name.toLowerCase().includes($UI.initSearch.value.toLowerCase()) || !token.dm) : false)
                    createTracker(token);
                continue;
            }
            createTracker(token);
        }
    }
    $UI.initiativeTrackerDiv.scrollTop = previousInitiativeTrackerScrollPosition;
}

let isDraggingTracker = false;
function createTracker(trackerData:Token) {
    if (trackerData.initiative == null && trackerData.name == null && trackerData.ac == null && trackerData.hp == null) { return; }
    const initiativeItem = document.createElement("div");
    initiativeItem.id = trackerData.id;
    initiativeItem.className = "d-flex gap-1 p-2 border border-dark-subtle rounded";
    initiativeItem.draggable = true;
    initiativeItem.addEventListener("drop", (e) => {
        if (isDraggingTracker) {
            if (e.dataTransfer?.getData("trackerId") !== trackerData.id) {
                socket.emit("switchTrackerPosition", {origin: e.dataTransfer?.getData("trackerId") as ID, target: trackerData.id});
            }
            isDraggingTracker = false;
        }
    });
    initiativeItem.addEventListener("dblclick", () => {
       getChildren($UI.tokensDiv).find((e) => e.id === trackerData.id)?.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
    });

    initiativeItem.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData('trackerId', trackerData.id);
        isDraggingTracker = true;
    });
    initiativeItem.addEventListener("dragend", () => {
        isDraggingTracker = false;
    })
    initiativeItem.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
    initiativeItem.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    initiativeItem.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        $UI.detailsScreen.style.display = "";
        selectedToken = trackerData.id;
        selectedBlocker = '0-0-0-0-0';
        selectedShapeId = '0-0-0-0-0';
        updateHighlights();
        LoadTokenData(trackerData);
    });
    initiativeItem.insertAdjacentHTML('beforeend', `
    <div class="flex-shrink-1">
        <div class="d-flex align-items-center bg-body border rounded h-100">
            <span id="initIcon" class="p-2" style="cursor: pointer;"><i class="bi-clock"></i></span>
            <div class="border-start h-100"></div>
            <span class="p-2 text-center align-self-center"/>${trackerData.initiative ?? ""}</span>
        </div>
    </div>
    <div class="flex-grow-1">
        <div class="d-flex align-items-center bg-body border rounded h-100">
            <span class="p-2"><i class="bi-person-fill"></i></span>
            <div class="border-start h-100"></div>
            <span class="p-2 text-center text-break">${trackerData.name ?? ""}</span>
        </div>
    </div>
    <div class="flex-shrink-1">
        <div class="d-flex align-items-center bg-body border rounded h-100">
            <span class="p-2" id="heartIcon" style="cursor: pointer;"><i class="bi-heart-fill text-danger"></i></span>
            <div class="border-start h-100"></div>
            <span class="p-2 text-center">${trackerData.hp?.split('/')[0] ?? ""}</span>
            <div class="border-start h-100"></div>
            <span class="p-2 text-center">${trackerData.hp?.split('/')[1] ?? ""}</span>
        </div>
    </div>
    <div class="flex-shrink-1">
        <div class="d-flex align-items-center bg-body border rounded h-100">
            <span class="p-2"><i class="bi-shield-shaded"></i></span>
            <div class="border-start h-100"></div>
            <span class="p-2 text-center">${trackerData.ac ?? ""}</span>
        </div>
    </div>
    `);
    const initIcon = initiativeItem.querySelector('#initIcon')!;
    initIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        socket.emit('changeTurn', {id: mapData.currentTurn !== trackerData.id ? trackerData.id : '0-0-0-0-0'});
    });

    const hpIcon = initiativeItem.querySelector('#heartIcon')!;
    hpIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const damage = promptInteger("Enter the damage to deal to this token: ");
        if (damage === null || isNaN(damage)) { return; }
        if (trackerData.hp == null) { return; }
        const [minHP, maxHP] = trackerData.hp.split('/').map((h) => Number.parseFloat(h));
        socket.emit("editToken", {id: trackerData.id, hp: `${minHP - damage}/${maxHP}`});
    });
    initiativeItem.setAttribute("id", trackerData.id);
    initiativeItem.setAttribute("dm", trackerData.dm.toString());
    $UI.initiativeTrackerDiv.appendChild(initiativeItem);
    updateHighlights();
}

function updateHighlightedTracker() {
    if (selectedToken === "0-0-0-0-0") {
        $UI.detailsScreen.style.display = "none";
    }
    for (const currentInitTracker of getChildren($UI.initiativeTrackerDiv)) {
        if (currentInitTracker.tagName=="DIV") {
            if (currentInitTracker.id === selectedToken) {
                currentInitTracker.scrollIntoView();
                currentInitTracker.style.background = currentInitTracker.getAttribute("dm") === "true" ? "#a14b28" : "#3b3b96";
            } else {
                currentInitTracker.style.background = currentInitTracker.getAttribute("dm") === "true" ? "#614d45" : "#424254";
            }
            if (currentInitTracker.id === mapData.currentTurn) {
                currentInitTracker.classList.remove('border-dark-subtle');
                currentInitTracker.classList.add('border-warning');
            } else {
                currentInitTracker.classList.remove('border-warning');
                currentInitTracker.classList.add('border-dark-subtle');
            }
        }
    }
}

function DetailsToggleButtonsUpdate(concentrating:boolean|undefined, hide:boolean|undefined) {
    $UI.concentratingInput.style.backgroundColor = concentrating ? getComputedStyle(document.body).getPropertyValue("--toggle-highlighted-color") : "";
    ($UI.hideTrackerInput.children[0] as HTMLImageElement).src = hide ? "images/visibility_off-24px.svg" : "images/visibility-24px.svg";
    $UI.hideTrackerInput.style.backgroundColor = hide ? getComputedStyle(document.body).getPropertyValue("--toggle-highlighted-color") : "";
}
//#endregion

//#region Menu events
function SyncSideMenu() {
    $UI.sideMenuCollapse.style.display = sideMenuExpanded ? "" : "none";
    $UI.sideMenuToggleIcon.classList.toggle('bi-arrow-bar-left', !sideMenuExpanded);
    $UI.sideMenuToggleIcon.classList.toggle('bi-arrow-bar-right', sideMenuExpanded);
    $UI.viewport.style.width = `calc(100% - ${$UI.sideMenu.offsetWidth}px)`;
    $UI.sideMenuToggle.style.right = sideMenuExpanded ? `${$UI.sideMenu.offsetWidth}px` : '0px';
}

$UI.sideMenuToggle.onclick = () => {
    sideMenuExpanded = !sideMenuExpanded;
    SyncSideMenu();
}

$UI.sortTracker.onclick = () => {
    socket.emit("sortTracker");
}

$UI.initSearch.oninput = () => {
    updateTracker(); 
}

$UI.bulkTokenConfirm.onclick = () => {
    flag.isPlacingBulkOrigin = true;
}
//#endregion

//#region Side buttons
$UI.toggleGrid.oncontextmenu = (e) => {
    e.preventDefault();
    $UI.startGridAligner.click();
}

$UI.toggleGrid.onclick = () => {
    gridActive = !gridActive;
    drawGrid();
    updateButtonColors();
}

$UI.toggleSnap.onclick = () => {
    gridSnap = !gridSnap;
    updateButtonColors();
}

$UI.quickPolyButton.onclick = () => {
    if (isDM) {
        if (flag.quickPolyBlockerMode) {
            if(confirm("Add the new blocker?") && newPolyBlockerVerts.length>2)
                socket.emit("addCustomPolyBlocker", {newPolyBlockerVerts: newPolyBlockerVerts});
            flag.quickPolyBlockerMode = false;
            newPolyBlockerVerts = [];
            DrawNewPolyMarkers();
        } else {
            flag.quickPolyBlockerMode = true;
            drawCanvas();
        }
    }
    updateButtonColors();
}

let displayMapSettings = false;
$UI.toggleSettings.onclick = () => {
    displayMapSettings = !displayMapSettings;
    updateButtonColors();
}

$UI.mapOptionsMenuClose.onclick = () => {
    displayMapSettings = false;
    updateButtonColors();
}

draggableElement($UI.mapOptionsMenuBox, true, undefined, undefined, undefined, undefined, undefined, $UI.mapOptionsMenuBody, false);

let displayColorPicker = false;
$UI.colorPickerButton.onclick = () => {
    displayColorPicker = !displayColorPicker;
    updateButtonColors();
}

$UI.toggleBlockerEditing.onclick = () => {
    flag.blockerEditMode = !flag.blockerEditMode;
    drawCanvas();
    updateButtonColors();
}
//#endregion

//#region Color picker
$UI.redSlider.oninput = updateColorPreview;
$UI.greenSlider.oninput = updateColorPreview;
$UI.blueSlider.oninput = updateColorPreview;
$UI.opacitySlider.oninput = updateColorPreview;

$UI.redSlider.oninput = updateColor;
$UI.greenSlider.onchange = updateColor;
$UI.blueSlider.onchange = updateColor;
$UI.opacitySlider.onchange = updateColor;

function componentToHex(c:number, isAlpha?:boolean) {
    if (isAlpha) {
        c = Math.floor(c*255);
    }
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbaToHex(r:number, g:number, b:number, a:number):`#${string}` {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}${componentToHex(a, true)}`;
}

function hexToRgba(hex:`#${string}`) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: parseInt(result[4], 16),
    } : {
        r: 0,
        g: 0,
        b: 0,
        a: 0,  
    };
}

function setColor(hexValue:`#${string}`) {
    shapeColor = hexValue;
    const components = hexToRgba(hexValue);
    $UI.redSlider.value = components.r.toString();
    $UI.greenSlider.value = components.g.toString();
    $UI.blueSlider.value = components.b.toString();
    $UI.opacitySlider.value = (components.a/255).toString();
    $UI.colorPickerButton.style.backgroundColor = "rgba("+$UI.redSlider.value+","+$UI.greenSlider.value+","+$UI.blueSlider.value+","+$UI.opacitySlider.value+")";
}

function updateColorPreview() {
    $UI.colorPickerButton.style.backgroundColor = "rgba("+$UI.redSlider.value+","+$UI.greenSlider.value+","+$UI.blueSlider.value+","+$UI.opacitySlider.value+")";
}

function updateColor() {
    shapeColor = rgbaToHex(parseInt($UI.redSlider.value), parseInt($UI.greenSlider.value), parseInt($UI.blueSlider.value), parseFloat($UI.opacitySlider.value));
    $UI.colorPickerButton.style.backgroundColor = "rgba("+$UI.redSlider.value+","+$UI.greenSlider.value+","+$UI.blueSlider.value+","+$UI.opacitySlider.value+")";
    setCookie("shapeColor", shapeColor);
}
//#endregion

//#region Details menu
draggableElement($UI.notesBox, true, undefined, undefined, undefined, undefined, undefined, $UI.notesBoxTextArea, false);

$UI.hpIcon.onclick = () => {
    updateSelectedTokenData();
    const damage = promptInteger("Enter the damage to deal to this token: ");
    if (damage === null || isNaN(damage)) { return; }
    if (selectedTokenData.hp == null) { return; }
    const [minHP, maxHP] = selectedTokenData.hp.split('/').map((h) => Number.parseFloat(h));
    socket.emit("editToken", {id: selectedTokenData.id, hp: `${minHP - damage}/${maxHP}`});
}

let notesTargetToken : ID;
let noteData : Token;
$UI.noteArea.oninput = () => {
    noteData = mapData.tokens.find((t) => t.id === notesTargetToken) ?? noteData;
    if (CheckTokenPermission(noteData)) {
        socket.emit("editToken", {id: notesTargetToken, notes: $UI.noteArea.value});
    }
}

$UI.notesBoxTextArea.oninput = () => {
    noteData = mapData.tokens.find((t) => t.id === notesTargetToken) ?? noteData;
    if (CheckTokenPermission(noteData)) {
        socket.emit("editToken", {id: notesTargetToken, notes: $UI.notesBoxTextArea.value});
    }
}

$UI.initiativeInput.oninput = () => {
    updateSelectedTokenData();
    const newInit = Number.parseFloat($UI.initiativeInput.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, initiative: !isNaN(newInit) ? newInit : null});
    }
}

$UI.nameInput.oninput = () => {
    updateSelectedTokenData();
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, name: $UI.nameInput.value});
    }
}

$UI.acInput.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.acInput.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, ac: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.refDef.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.refDef.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, refDef: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.fortDef.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.fortDef.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, fortDef: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.willDef.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.willDef.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, willDef: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.mentalDef.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.mentalDef.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, mentalDef: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.physicalDef.oninput = () => {
    updateSelectedTokenData();
    const newAC = Number.parseFloat($UI.physicalDef.value);
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, physicalDef: !isNaN(newAC) ? newAC : null});  
    }
}

$UI.currentHpInput.oninput = () => {
    updateSelectedTokenData();
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, hp: `${Number($UI.currentHpInput.value)}/${Number($UI.maxHpInput.value)}`});
    }
}

$UI.maxHpInput.oninput = () => {
    updateSelectedTokenData();
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, hp: `${Number($UI.currentHpInput.value)}/${Number($UI.maxHpInput.value)}`});
    }
}

$UI.statusInput.oninput = () => {
    updateSelectedTokenData();
    socket.emit("editToken", {id: selectedToken, status: $UI.statusInput.value});
}

$UI.groupIdInput.oninput = () => {
    const newGroupId = Number.parseInt($UI.groupIdInput.value);
    updateSelectedTokenData();
    if (CheckTokenPermission(selectedTokenData)) {
        socket.emit("editToken", {id: selectedToken, group: !isNaN(newGroupId) ? newGroupId : null});
    }    
}

$UI.hideTrackerInput.onclick = () => {
    updateSelectedTokenData();
    socket.emit("editToken", {id: selectedToken, hideTracker: !selectedTokenData.hideTracker});
}

$UI.concentratingInput.onclick = () => {
    updateSelectedTokenData();
    socket.emit("editToken", {id: selectedToken, concentrating: !selectedTokenData.concentrating});
}
//#endregion

//#region DM Menu
$UI.clearTokens.onclick = () => {
    if (confirm("Do you really want to remove all the tokens?") && isDM) {
        socket.emit("clearTokens");
    }
}

$UI.clearDrawings.onclick = () => {
    if (confirm("Do you really want to remove all the drawings?") && isDM) {
        socket.emit("clearDrawings");
    }
}

$UI.clearBlockers.onclick = () => {
    if (confirm("Do you really want to remove all the blockers?") && isDM) {
        socket.emit("clearBlockers");
    }
}

$UI.blockerTypeSelect.onchange = () => {
    if (confirm("Are you sure you want to switch blocker types?") && isDM) {
        flag.quickPolyBlockerMode = false;
        $UI.quickPolyButton.style.display = $UI.blockerTypeSelect.value === '1' ? "" : "none";
        socket.emit("switchBlockerType", {type: Number.parseFloat($UI.blockerTypeSelect.value)});
    }
}

$UI.invertBlockers.onclick = () => {
    if (confirm("Do you really want to invert the blockers?") && isDM) {
        socket.emit("invertBlockers");
    }
}

$UI.togglePlayerMode.onclick = () => {
    flag.playerMode = !flag.playerMode;
    updateButtonColors();
    $UI.shapeMap.style.zIndex = flag.playerMode ? "" : '941';
    baseTokenIndex = flag.playerMode ? 0 : 500;
    drawCanvas();
}
//#endregion

//#region Main event handlers
function updateHighlights() {
    updateHighlightedBlocker();
    updateHighlightedShape();
    updateHighlightedToken();
    updateHighlightedTracker();
}

function CheckAntiBlockerPixel(e:MouseEvent) {
    if (mapData.antiBlockerOn) {
        return antiBlockerContext.getImageData(Math.round((e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20)), Math.round((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20)), 1, 1, ).data[3] == 0;
    }
    return true;
}

function CheckAntiBlockerPixelPosition(x:number, y:number) {
    const pixel = antiBlockerContext.getImageData(x, y, 1, 1).data;
    return pixel[3] == 0;
}

function updateSelectedTokenData() {
    selectedTokenData = mapData.tokens.find((token) => token.id === selectedToken) ?? selectedTokenData;
}

function CheckTokenPermission(token:Token) {
    if (token==null)
        return false;
    if (token.dm!=null)
        return !(!isDM && token.dm);
    else {
        if (token.image!=null)
            return isDM || mapData.tokenList.includes(token.image);
    }
}

function DrawNewPolyMarkers(activateMousedown?:boolean) {
    $UI.newPolyBlockerHandles.innerHTML = "";
    for (const [j, vert] of newPolyBlockerVerts.entries()) {
        const editHandleContainer = document.createElement("div");
        editHandleContainer.style.position = "absolute";
        editHandleContainer.style.left = vert.x.toString();
        editHandleContainer.style.top = vert.y.toString();
        const editHandle = document.createElement("div");
        editHandle.className = "newPolyBlockerHandle";
        editHandle.style.left = "-0.35vw";
        editHandle.style.top = "-0.35vw";
        editHandle.title = (j+1).toString();
        
        editHandle.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const menuOptions = [
                {text: "Remove vert", hasSubMenu: false, callback: () => {
                    newPolyBlockerVerts.splice(j, 1);
                    DrawNewPolyMarkers();
                }}
            ];
            displayMenu(e, menuOptions);
        });

        draggableElement(editHandleContainer, true, undefined, (e) => {
            if (((e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20))!=vert.x && ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20))!=vert.y) {
                vert.x = (e.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20);
                vert.y = (e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20);
                DrawNewPolyMarkers();
            }
        })

        editHandle.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        editHandleContainer.appendChild(editHandle);
        $UI.newPolyBlockerHandles.appendChild(editHandleContainer);
        if (j==newPolyBlockerVerts.length-1 && activateMousedown) {
            editHandle.dispatchEvent(new Event('mousedown'));
        }
    }
}

window.addEventListener("mousedown", (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    if (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))>0 && ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))<mapPreload.width && ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))>0 && ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))<mapPreload.height) {
        socket.emit("requestPing", {pingX: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)), pingY: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))});
    }
});

window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    document.body.style.cursor = "";
    flag.isPanning = false;
    updateHighlights();

    if (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))<0 || ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) > mapPreload.width || ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))<0 || ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) > mapPreload.height) {
        flag.isMovingShape = false;
        flag.isMovingCone = false;
        flag.isMoving5ftLine = false;
        return;
    }
    if (flag.isMovingShape) {
        flag.isMovingShape = false;
        if (CheckAntiBlockerPixelPosition(((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) + shapeDragOffset.x, ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) + shapeDragOffset.y) || (isDM&&!flag.playerMode)) {
            socket.emit("editDrawing", {id: movingShapeId, x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) + shapeDragOffset.x, y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) + shapeDragOffset.y, both: true, moveShapeGroup: (e.ctrlKey || e.metaKey)});
            movingShapeId = '0-0-0-0-0'
        }
        return;
    }

    if (flag.isMovingCone) {
        const movingShapeData = mapData.drawings.find((s) => s.id === movingShapeId);
        if (movingShapeData === undefined) {
            throw new Error(`Shape ${movingShapeId} is missing!`);
        }
        flag.isMovingCone = false;
        let angle = movingShapeData.angle + (Math.atan2((((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - shapeDragOffset.y), (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - shapeDragOffset.x)) - shapeDragStartAngle);
        if (angle<0) {
            angle+=2*Math.PI;
        }
        socket.emit("editDrawing", {id: movingShapeId, angle: angle});
        return;
    }

    if (flag.isMoving5ftLine) {
        const movingShapeData = mapData.drawings.find((s) => s.id === movingShapeId);
        if (movingShapeData === undefined) {
            throw new Error(`Shape ${movingShapeId} is missing!`);
        }
        flag.isMoving5ftLine = false;
        let angle = movingShapeData.angle + (Math.atan2((((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - shapeDragOffset.y), (((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - shapeDragOffset.x)) - shapeDragStartAngle);
        if (angle<0)
            angle+=2*Math.PI;
        socket.emit("editDrawing", {id: movingShapeId, angle: angle});
        return;
    }
});

document.body.addEventListener("keydown", (e) => {
    if ((e.code.includes("Numpad") && document.activeElement?.tagName!="INPUT" && document.activeElement?.tagName!="TEXTAREA") || (e.code.includes("Numpad") && isNaN(parseInt(e.key))))
        e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
        switch(e.code) {
            case "Digit0":
                extraZoom = 0;
                break;
            case "Minus":
                extraZoom-=1;
                $UI.board.style.transform = "scale("+(1+extraZoom/20).toString()+")";
                $UI.viewport.scrollLeft =$UI.viewport.scrollLeft/((1+extraZoom/20)/(1+(extraZoom-1)/20));
                $UI.viewport.scrollTop =$UI.viewport.scrollTop/((1+extraZoom/20)/(1+(extraZoom-1)/20));
                e.preventDefault();
                break;
            case "Equal":
                extraZoom+=1;
                $UI.board.style.transform = "scale("+(1+extraZoom/20).toString()+")";
                $UI.viewport.scrollLeft =$UI.viewport.scrollLeft*((20+extraZoom)/(20+extraZoom-1));
                $UI.viewport.scrollTop =$UI.viewport.scrollTop*((20+extraZoom)/(20+extraZoom-1));
                e.preventDefault();
                break;
        }
    }
});

document.body.addEventListener("keyup", (e) => {
    if ((document.activeElement?.tagName!="INPUT" && document.activeElement?.tagName!="TEXTAREA") || (e.code.includes("Numpad") && isNaN(parseInt(e.key))) || (e.altKey && e.code=="KeyH")) {
        e.preventDefault();
        let tX;
        let tY;
        switch (e.code) {
            case "Numpad8":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x*selectedTokenData.size)) * (gridSize.x*selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - gridSize.y*selectedTokenData.size - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y*selectedTokenData.size)) * (gridSize.y*selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY>0 && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
            
            case "Numpad7":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x - gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x - gridSize.x*selectedTokenData.size - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x*selectedTokenData.size)) * (gridSize.x*selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - gridSize.y*selectedTokenData.size - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y*selectedTokenData.size)) * (gridSize.y*selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY>0 && tX>0 && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
        
            case "Numpad9":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x + gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x + (gridSize.x * selectedTokenData.size) - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - (gridSize.y * selectedTokenData.size) - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY>0 && tX < mapPreload.width && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;

            case "Numpad4":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x - gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x - (gridSize.x * selectedTokenData.size) - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tX>0 && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
        
            case "Numpad6":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x + gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x + (gridSize.x * selectedTokenData.size) - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tX < mapPreload.width && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
            
            case "Numpad2":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + (gridSize.y * selectedTokenData.size) - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY<mapPreload.height && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
            
            case "Numpad1":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x - gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x - (gridSize.x * selectedTokenData.size) - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + (gridSize.y * selectedTokenData.size) - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY<mapPreload.height && tX>0 && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;
        
            case "Numpad3":
                updateSelectedTokenData();
                if (selectedTokenData.size >= 1) {
                    tX = Math.round((selectedTokenData.x + gridSize.x - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/gridSize.x) * gridSize.x + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + gridSize.y - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/gridSize.y) * gridSize.y + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                } else {
                    tX = Math.round((selectedTokenData.x + (gridSize.x * selectedTokenData.size) - mapData.offsetX - 0.5 * gridSize.x * selectedTokenData.size)/(gridSize.x * selectedTokenData.size)) * (gridSize.x * selectedTokenData.size) + 0.5 * gridSize.x * selectedTokenData.size + offsetX + GridLineWidth;
                    tY = Math.round((selectedTokenData.y + (gridSize.y * selectedTokenData.size) - mapData.offsetY - 0.5 * gridSize.y * selectedTokenData.size)/(gridSize.y * selectedTokenData.size)) * (gridSize.y * selectedTokenData.size) + 0.5 * gridSize.y * selectedTokenData.size + offsetY + GridLineWidth;
                }
                if (tY<mapPreload.height && tX < mapPreload.width && (CheckAntiBlockerPixelPosition(tX, tY) || (isDM && !flag.playerMode))) {
                    socket.emit("moveToken", {id: selectedToken, x: tX, y: tY, bypassLink: !(e.ctrlKey || e.metaKey)});
                }
                break;

            case "KeyC":
                $UI.colorPickerButton.click();
                break;

            case "KeyG":
                gridActive = !gridActive;
                updateButtonColors();
                drawGrid();
                break;
            
            case "KeyS":
                gridSnap = !gridSnap;
                updateButtonColors();
                break;

            case "KeyM":
                if (isDM)
                    $UI.togglePlayerMode.click();
                break;

            case "KeyB":
                if (isDM) {
                    flag.blockerEditMode = !flag.blockerEditMode;
                    updateButtonColors();
                    drawCanvas();
                }
                break;

            case "KeyP":
                if (isDM && (mapData.blockerType==1))
                    $UI.quickPolyButton.click();
            break;

            case "KeyH":
                if (e.altKey)
                    $UI.hpIcon.click();
                break;

            case "Delete":
                if (isDM) {
                    if (selectedToken !== '0-0-0-0-0') {
                        socket.emit("removeToken", {id: selectedToken});
                        selectedToken = '0-0-0-0-0';
                        return;
                    }
                    if (selectedBlocker !== '0-0-0-0-0') {
                        socket.emit(mapData.blockerType==1 ? "removePolyBlocker" : "removeBlocker", {id: selectedBlocker});
                        selectedBlocker = '0-0-0-0-0';
                        return;
                    }
                }
                break;
        }
    }
});

draggableElement($UI.bulkTokenBox, true, undefined, undefined, undefined, undefined, undefined, $UI.bulkTokenBoxBody, false);

$UI.bulkTokenRollEach.oninput = () => {
    if ($UI.bulkTokenRollEach.checked) {
        $UI.bulkTokenRollOnce.checked = false;
    }        
}

$UI.bulkTokenRollOnce.oninput = () => {
    if ($UI.bulkTokenRollOnce.checked) {
        $UI.bulkTokenRollEach.checked = false;
    }
}

$UI.bulkTokenInit.oninput = () => {
    $UI.bulkTokenRollOnce.disabled = $UI.bulkTokenInit.value !== "";
    $UI.bulkTokenRollEach.disabled = $UI.bulkTokenInit.value !== "";
    if ($UI.bulkTokenInit.value !== "") {
        $UI.bulkTokenRollEach.checked = false;
        $UI.bulkTokenRollOnce.checked = false;
    }
}

function placeBulkOrigin(e:MouseEvent) {
    const bulkSettings = {
        image: $UI.bulkTokenImageSelect.value,
        name: $UI.bulkTokenNameInput.value,
        amount: Number.parseInt($UI.bulkTokenAmountInput.value),
        size: Number.parseFloat($UI.bulkTokenSize.value),
        group: Number.parseFloat($UI.bulkTokenGroup.value),
        hp: Number.parseFloat($UI.bulkTokenHP.value),
        ac: Number.parseFloat($UI.bulkTokenAC.value),
        fixedInit: Number.parseFloat($UI.bulkTokenInit.value),
        dex: Number($UI.bulkTokenDex.value),
        hideToken: $UI.bulkTokenHideToken.checked,
        hideTracker: $UI.bulkTokenHideTracker.checked,
        rollOnce: $UI.bulkTokenRollOnce.checked,
        rollEach: $UI.bulkTokenRollEach.checked,
    }
    if (isNaN(bulkSettings.amount)) {
        alert("Missing amount of tokens!");
        return;
    }
    if (isNaN(bulkSettings.size)) {
        alert("Missing token size!");
        return;
    }
    const origin = {
        x: (e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20),
        y: (e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20),
    }
    let tokenInit;
    if (bulkSettings.rollOnce) {
        tokenInit = Math.ceil(Math.random()*20) + bulkSettings.dex;
    }
    if (!bulkSettings.rollEach && !bulkSettings.rollOnce && !isNaN(bulkSettings.fixedInit)) {
        tokenInit = bulkSettings.fixedInit;
    }
    for (let f = 0; f < bulkSettings.amount; f++) {
        if (bulkSettings.rollEach) {
            tokenInit = Math.ceil(Math.random()*20) + bulkSettings.dex;
        }
        const tokenPos = {
            x: origin.x + (f % Math.ceil(Math.sqrt(bulkSettings.amount))) * bulkSettings.size * gridSize.x,
            y: origin.y + (Math.floor(f / Math.ceil(Math.sqrt(bulkSettings.amount)))) * bulkSettings.size * gridSize.y,
        }
        socket.emit("createToken", {
            text: bulkSettings.name !== "" ? `${bulkSettings.name} ${f+1}` : (f+1).toString(),
            image: bulkSettings.image !== "number" ? bulkSettings.image : undefined,
            x: tokenPos.x,
            y: tokenPos.y,
            size: bulkSettings.size,
            layer: 50-bulkSettings.size,
            dm: true,
            name: bulkSettings.name ? `${bulkSettings.name} ${f+1}` : (f+1).toString(),
            initiative: bulkSettings.rollEach || bulkSettings.rollOnce || bulkSettings.fixedInit !== undefined ? tokenInit : undefined,
            hidden: bulkSettings.hideToken,
            group: !isNaN(bulkSettings.group) ? bulkSettings.group : undefined,
            hideTracker: bulkSettings.hideTracker,
            hp: !isNaN(bulkSettings.hp) ? `${bulkSettings.hp}/${bulkSettings.hp}` : undefined,
            ac: !isNaN(bulkSettings.ac) ? bulkSettings.ac : undefined,
        });
    }
    flag.isPlacingBulkOrigin = false;
}

$UI.mapImage.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    selectedToken = '0-0-0-0-0';
    selectedBlocker = '0-0-0-0-0';
    selectedShapeId = '0-0-0-0-0';
    updateHighlights();
    $UI.detailsScreen.style.display = "none";
    
    if (flag.isPlacingBulkOrigin) { placeBulkOrigin(e); }

    if (flag.quickPolyBlockerMode) {
        newPolyBlockerVerts.push({x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)), y: ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20))});
        DrawNewPolyMarkers(true);
        return;
    }

    if (flag.isPlacingSquare) {
        flag.isPlacingSquare = false;
        squareMarkers.width = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - squareMarkers.x;
        squareMarkers.height = ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - squareMarkers.y;
        if (Math.abs(squareMarkers.width) > mapPreload.width || Math.abs(squareMarkers.height) > mapPreload.height) {
            alert("That square was too large or too small");
            return;
        }   
        if (!CheckAntiBlockerPixel(e) && (!isDM || flag.playerMode)) { return; }
        socket.emit("addDrawing", {shape: "square", x: squareMarkers.x, y: squareMarkers.y, width: squareMarkers.width, height: squareMarkers.height, trueColor: shapeColor, visible: isDM ? confirm("Should the shape be visible?") : true});
        return;
    }

    if (flag.isPlacingBlocker) {
        flag.isPlacingBlocker = false;
        if (!isDM) { return; }
        blockerMarkers.width = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)) - blockerMarkers.x;
        blockerMarkers.height = ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)) - blockerMarkers.y;
        socket.emit("addBlocker", {x: blockerMarkers.x, y: blockerMarkers.y, width: blockerMarkers.width, height: blockerMarkers.height});
        return;
    }
    if (flag.isPlacingLine) {
        lineMarkers.destX = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        lineMarkers.destY = ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        if ((isDM&&!flag.playerMode) || CheckAntiBlockerPixel(e)) {
            let shapeIsVisible = true;
            if (isDM)
                shapeIsVisible = confirm("Should the shape be visible?");
            socket.emit("addDrawing", {shape: "vertexLine", verts:[{x: lineMarkers.x, y: lineMarkers.y}, {x: lineMarkers.destX, y: lineMarkers.destY}], trueColor: shapeColor, visible: shapeIsVisible});
        }
        
        flag.isPlacingLine = false;
        return;
    }
    if (flag.isPlacing5ftLine) {
        const destX = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        const destY = ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
        let angle = Math.atan2((destY - thickLineMarkers.y), (destX - thickLineMarkers.x));
        if (angle<0) { angle+=2*Math.PI; }
        if ((isDM&&!flag.playerMode) || CheckAntiBlockerPixel(e)) {
            let shapeIsVisible = true;
            if (isDM)
                shapeIsVisible = confirm("Should the shape be visible?");
            socket.emit("addDrawing", {shape: "5ftLine", x: thickLineMarkers.x, y: thickLineMarkers.y, angle: angle, trueColor: shapeColor, link: thickLineMarkers.linkId, range: thickLineMarkers.range, visible: shapeIsVisible});
        }
        
        flag.isPlacing5ftLine = false;
        return;
    }
    if (flag.isPlacingCone) {
        const destX = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        const destY = ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20));
        let angle = Math.atan2((destY - coneMarkers.y), (destX - coneMarkers.x));
        if (angle<0) { angle+=2*Math.PI; }
        if ((isDM&&!flag.playerMode) || CheckAntiBlockerPixel(e))
            socket.emit("addDrawing", {shape: "cone", link: coneMarkers.linkId, x: coneMarkers.x, y: coneMarkers.y, angle: angle, range: coneMarkers.range, trueColor: shapeColor, visible: isDM ? confirm("Should the shape be visible?") : true, is90Deg: coneMarkers.is90Deg});
        
        flag.isPlacingCone = false;
        return;
    }
    flag.isPanning = true;
    oldMousePos.x = e.pageX;
    oldMousePos.y = e.pageY;
    oldScrollPos.x =$UI.viewport.scrollLeft;
    oldScrollPos.y =$UI.viewport.scrollTop;
    document.body.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
    if (!flag.isPanning) { return; }
    $UI.viewport.scrollLeft = oldScrollPos.x + oldMousePos.x - e.pageX;
    $UI.viewport.scrollTop = oldScrollPos.y + oldMousePos.y - e.pageY;
});

$UI.mapImage.addEventListener("dragstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
});

$UI.mapImage.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (!flag.isPanning) {
        if (CheckAntiBlockerPixel(e) || (isDM&&!flag.playerMode)) {
            displayContextMenu(e);
        } else {
            closeMenu();
            closeSubMenu();
        }
    }
});

function displayContextMenu(e:MouseEvent) {
    const listOptions:ContextMenuOption[] = [
        {text: "Place Token", hasSubMenu: true, callback: () => {
            const subMenu = new Array<SubContextMenuOption>();
            const tokenList = mapData.tokenList;
            const dmTokenList = mapData.dmTokenList;
            subMenu.push({text: "Text token", callback: () => {
                const textToDisplay = prompt("Enter the text to display on the text token:") ?? '';
                const tokenSize = Number.parseFloat(prompt("Please enter the size of the token") ?? "");
                if (isNaN(tokenSize)) {
                    alert("That wasn't a valid size!"); return; 
                }
                if (isDM && (tokenSize > 49  || tokenSize <= 0)) {
                    alert("The desired size is too large or invalid"); return;
                }
                if (!isDM && (tokenSize > 6 || tokenSize <= 0)) {
                    alert("That token size isn't allowed for players"); return;
                }
                console.log(`Placing text token '${textToDisplay}' with size ${tokenSize} at ${((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))}:${((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))}`);
                socket.emit("createToken", {text: textToDisplay, x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)), y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)), size: tokenSize, status: "", layer: 50-tokenSize, dm: isDM ? confirm("Make this a DM token?") : false});
            }});
            for (const tokenImage of tokenList) {
                subMenu.push({
                    text: tokenImage.substring(0, tokenImage.length - 4),
                    callback: () => {
                        const tokenSize = Number.parseFloat(prompt("Please enter the size of the token") ?? "");
                        if (isNaN(tokenSize)) { alert("That wasn't a valid size!"); return; }
                        if (isDM && (tokenSize > 49  || tokenSize <= 0)) { alert("The desired size is too large or invalid"); return; }
                        if (!isDM && (tokenSize > 6 || tokenSize <= 0)) { alert("That token size isn't allowed for players"); return; }
                        console.log(`Placing ${tokenImage} with size ${tokenSize} at ${((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))}:${((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))}`);
                        socket.emit("createToken", {
                            x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)),
                            y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)),
                            image: tokenImage,
                            size: tokenSize,
                            status: "",
                            layer: 50-tokenSize,
                            dm: false,
                            text: ""
                        });
                    }
                });
            }
            if (isDM) {
                for (const tokenImage of dmTokenList) {
                    subMenu.push({
                        text: tokenImage.substring(0, tokenImage.length - 4),
                        callback: () => {
                            const tokenSize = Number.parseFloat(prompt("Please enter the size of the token") ?? "");
                            if (isNaN(tokenSize)) { alert("That wasn't a valid size!"); return; }
                            if (isDM && (tokenSize > 49  || tokenSize <= 0)) { alert("The desired size is too large or invalid"); return; }
                            if (!isDM && (tokenSize > 6 || tokenSize <= 0)) { alert("That token size isn't allowed for players"); return; }
                            console.log(`Placing ${tokenImage} with size ${tokenSize} at ${((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))}:${((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))}`);
                            socket.emit("createToken", {
                                x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)),
                                y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)),
                                image: tokenImage,
                                size: tokenSize,
                                status: "",
                                layer: 50-tokenSize,
                                dm: true,
                                text: ""
                            });
                        }
                    });
                }
            }
            displaySubMenu(e, subMenu);
        }},
        {text: "Draw Shape", hasSubMenu: true, callback: () => {
            const subMenuOptions = [
                {text: "Draw Circle", callback: () => {
                    const radiusInput = promptNumber("Please enter the desired radius in feet for your circle(s)");
                    if (radiusInput === null || isNaN(radiusInput)) { return; }
                    circleMarkers.radius = radiusInput / feetPerSquare;
                    circleMarkers.x = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
                    circleMarkers.y = ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20));
                    socket.emit("addDrawing", {shape: "circle", x: circleMarkers.x, y: circleMarkers.y, radius: circleMarkers.radius, trueColor: shapeColor, visible: isDM?confirm("Should the shape be visible?"):true});
                }},
                {text: "Draw Square", callback: () => {
                    squareMarkers.x = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
                    squareMarkers.y = ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20));
                    flag.isPlacingSquare = true;
                    drawCanvas();
                }},
                {text: "Draw Line", callback: () => {
                    lineMarkers.x = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
                    lineMarkers.y = ((e.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20));
                    flag.isPlacingLine = true;
                    drawCanvas();
                }}
            ];
            displaySubMenu(e, subMenuOptions);
        }}
    ]
    const DMoptions = [
        {text: "Place hidden Token", hasSubMenu: true, callback: () => {
            const subMenu = [
                {text: "Text token", callback: () => {
                    const textToDisplay = prompt("Enter the text to display on the text token:") ?? '';
                    const tokenSize = Number.parseFloat(prompt("Please enter the size of the token") ?? "");
                    if (isNaN(tokenSize)) { alert("That wasn't a valid size!"); return;  }
                    if (isDM && (tokenSize > 49  || tokenSize <= 0)) { alert("The desired size is too large or invalid"); return; }
                    console.log(`Placing hidden text token ${textToDisplay} with size ${tokenSize} at ${((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20))}:${((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20))}`);
                    socket.emit("createToken", {text: textToDisplay, x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)), y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)), size: tokenSize, status: "", layer: 50-tokenSize, dm: confirm("Make this a DM token?"), hidden: true});
                }}
            ];
            for (const tokenImage of mapData.tokenList) {
                subMenu.push({
                    text: tokenImage.substring(0, tokenImage.length - 4),
                    callback: () => {
                        const tokenSize = promptNumber("Please enter the size of the token");
                        if (tokenSize === null || isNaN(tokenSize)) { alert("That wasn't a valid size!"); return; }
                        if (tokenSize > 49 && tokenSize <= 0) { alert("The desired size is too large or invalid!"); return; }
                        console.log("Placing hidden " + tokenImage + " with size " + tokenSize + " at " + ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)).toString() + ":" + ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)).toString());
                        socket.emit("createToken", {
                            x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)),
                            y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)),
                            image: tokenImage,
                            size: tokenSize,
                            status: "",
                            hidden: true,
                            layer: 50-tokenSize,
                            dm: true,
                            text: ""
                        });
                    }
                });
            }
            for (const tokenImage of mapData.dmTokenList) {
                subMenu.push({
                    text: tokenImage.substring(0, tokenImage.length - 4),
                    callback: () => {
                        const tokenSize = promptNumber("Please enter the size of the token");
                        if (tokenSize === null || isNaN(tokenSize)) { alert("That wasn't a valid size!"); return; }
                        if (tokenSize > 49 && tokenSize <= 0) { alert("The desired size is too large or invalid!"); return; }
                        console.log("Placing hidden " + tokenImage + " with size " + tokenSize + " at " + ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)).toString() + ":" + ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)).toString());
                        socket.emit("createToken", {
                            x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)),
                            y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)),
                            image: tokenImage,
                            size: tokenSize,
                            status: "",
                            hidden: true,
                            layer: 50-tokenSize,
                            dm: true,
                            text: ""
                        });
                    }
                })
            }
            displaySubMenu(e, subMenu);
        }}
    ]

    if (selectedToken !== '0-0-0-0-0') {
        listOptions.push({text: "Measure Distance", hasSubMenu: false, callback: () => {
            updateSelectedTokenData();
            const targetCenterPos = {
                x: Math.floor(((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20) - mapData.offsetX) / gridSize.x),
                y: Math.floor(((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20) - mapData.offsetY) / gridSize.y),
            }
            const tokenCenterPos = {
                x: (selectedTokenData.x - mapData.offsetX) / gridSize.x,
                y: (selectedTokenData.y - mapData.offsetY) / gridSize.y,
            }
            const tokenRadius = selectedTokenData.size/2 - 0.5;
            const tokenMoveOrigin = {
                x: Math.floor(Math.min(Math.max(targetCenterPos.x, tokenCenterPos.x-tokenRadius), tokenCenterPos.x+tokenRadius)),
                y: Math.floor(Math.min(Math.max(targetCenterPos.y, tokenCenterPos.y-tokenRadius), tokenCenterPos.y+tokenRadius)),
            }
            const distance = {
                x: Math.abs(targetCenterPos.x - tokenMoveOrigin.x),
                y: Math.abs(targetCenterPos.y - tokenMoveOrigin.y),
            }
            switch (mapData.diagonalMovement) {
                case '5-10':
                    alert(`Distance: ${Math.max(distance.x, distance.y) + Math.floor(Math.min(distance.x, distance.y)/2)}`);
                    break;

                case 'taxi':
                    alert(`Distance: ${distance.x + distance.y}`);
                    break;
            }
        }});
    }

    if (flag.gridAlignMode) {
        const pos = {
            x: (e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20),
            y: (e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20),
        }
        listOptions.unshift({text: "Horizontal Aligner", hasSubMenu: false, callback: () => {
            const line = document.createElement('div');
            line.className = "position-absolute translate-middle-y start-0";
            line.style.top = `${pos.y}px`;
            line.style.zIndex = '9998';
            line.style.height = `${GridLineWidth}px`;
            line.style.width = `${mapPreload.width}px`;
            line.style.backgroundColor = 'magenta';
            const handle = document.createElement('div');
            handle.style.height = `${GridLineWidth*10}px`;
            handle.style.width = `${GridLineWidth*20}px`;
            handle.className = "position-absolute translate-middle-y border rounded";
            handle.style.backgroundColor = 'violet';
            handle.style.zIndex = '9999';
            handle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                displayMenu(e, [{
                    text: 'Delete',
                    hasSubMenu: false,
                    callback: () => {
                        $UI.hAlignHandles.removeChild(line);
                    }
                }])
            })
            line.appendChild(handle);
            $UI.hAlignHandles.appendChild(line);
            draggableElement(line, true);
        }}, {text: "Vertical Aligner", hasSubMenu: false, callback: () => {
            const line = document.createElement('div');
            line.className = "position-absolute translate-middle-x top-0";
            line.style.left = `${pos.x}px`;
            line.style.zIndex = '9998';
            line.style.width = `${GridLineWidth}px`;
            line.style.height = `${mapPreload.height}px`;
            line.style.backgroundColor = 'magenta';
            const handle = document.createElement('div');
            handle.style.height = `${GridLineWidth*20}px`;
            handle.style.width = `${GridLineWidth*10}px`;
            handle.className = "position-absolute translate-middle-x border rounded";
            handle.style.backgroundColor = 'violet';
            handle.style.zIndex = '9999';
            handle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                displayMenu(e, [{
                    text: 'Delete',
                    hasSubMenu: false,
                    callback: () => {
                        $UI.vAlignHandles.removeChild(line);
                    }
                }])
            })
            line.appendChild(handle);
            $UI.vAlignHandles.appendChild(line);
            draggableElement(line, true);
        }});
    }

    if (mapData.blockerType === 0) {
        DMoptions.push({text: mapData.antiBlockerOn?"Place Anti Blocker":"Place Blocker", hasSubMenu: false, callback: () => {
            blockerMarkers.x = (e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20);
            blockerMarkers.y = (e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20);
            flag.isPlacingBlocker = true;
            drawCanvas();
        }});
    }
    
    if (mapData.blockerType === 1) {
        DMoptions.push({
            text: mapData.antiBlockerOn ? "Create Anti Blocker" : "Create Blocker",
            hasSubMenu: false,
            callback: () => {
                socket.emit("addPolyBlocker", {x: ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20)), y: ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20)), offset: gridSize});    
            }
        });
    }

    if (isDM) {
        for (const option of DMoptions) {
            listOptions.push(option);
        }
    }
    displayMenu(e, listOptions);
}

window.onclick = function(event) {
    if (event.target === null) {
        return;
    }
    const ancestry = getAncestry(event.target as HTMLElement);
    let shouldCloseMenus = true;
    for (const element of ancestry) {
        try {
            if (element.classList.contains("custom-menu")) {
                shouldCloseMenus = false;
            }
        } catch {
            if (element.className.includes("custom-menu")) {
                shouldCloseMenus = false;
            }
        }
    }
    if (shouldCloseMenus) { 
        closeMenu();
        closeSubMenu();
    }
}

$UI.mapImage.addEventListener("dragover", (e) => {
    e.preventDefault();
});

$UI.mapImage.addEventListener("dragend", (e) => {
    e.preventDefault();
})

window.ondrop = (e) => {
    e.preventDefault();
    if (flag.isDraggingBlocker) {
        draggedBlocker.x = ((e.pageX+$UI.viewport.scrollLeft)/(1+extraZoom/20));
        draggedBlocker.y = ((e.pageY+$UI.viewport.scrollTop)/(1+extraZoom/20));
    }
}
//#endregion

//#region Context Menu and Submenu
    function displayMenu(event:MouseEvent, listData:ContextMenuOption[]) {
        closeMenu();
        closeSubMenu();
        $UI.customMenu.innerHTML = "";
        if (listData.length > 0) {
            let tmpHeight = listData.length * 4;
            if (tmpHeight > 28) {
                tmpHeight = 28;
                $UI.customMenu.style.overflowY = "scroll";
            } else {
                $UI.customMenu.style.overflowY = "hidden";
            }
            $UI.customMenu.style.display = "block";
            
            const posx = (event.pageX +$UI.viewport.scrollLeft)/(1+extraZoom/20);
            const posy = (event.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20);
            $UI.customMenu.style.transform = "scale("+1/(1+extraZoom/20)+")";
            $UI.customMenu.style.transformOrigin = "top left";
            $UI.customMenu.style.top = posy + "px";
            $UI.customMenu.style.left = posx + "px";
            $UI.customMenu.style.height = tmpHeight + "vh";
            
            for (const menuOption of listData) {
                const listItem = document.createElement('li');
                listItem.innerText = menuOption.text;
                listItem.style.userSelect = "none";
                listItem.className = "custom-menu-element";
                listItem.onclick = () => {
                    menuOption.callback();
                    if (menuOption.hasSubMenu != true) {
                        closeMenu();
                        closeSubMenu();
                    }
                }
                $UI.customMenu.appendChild(listItem);
            }
            if (event.pageX + $UI.customMenu.offsetWidth >= window.innerWidth + window.pageXOffset - $UI.sideMenu.offsetWidth) {
                $UI.customMenu.style.left = ((window.innerWidth +$UI.viewport.scrollLeft - $UI.customMenu.offsetWidth - $UI.sideMenu.offsetWidth - 5)/(1+extraZoom/20)).toString()+"px";
            }
            if (event.pageY + $UI.customMenu.offsetHeight > window.innerHeight + window.pageYOffset) {
                $UI.customMenu.style.top = ((window.innerHeight +$UI.viewport.scrollTop - $UI.customMenu.offsetHeight - 4)/(1+extraZoom/20)).toString()+"px";
            }
        }
    }
    
    function closeMenu() {
 $UI.customMenu.style.display = "none"; 
}

    function displaySubMenu(event:MouseEvent, listData:SubContextMenuOption[]) {
        $UI.customSubMenu.innerHTML = "";
        if (listData.length > 0) {
            let tmpHeight = listData.length * 4;
            if (tmpHeight > 60) {
                tmpHeight = 60;
                $UI.customSubMenu.style.overflowY = "scroll";
            } else {
                $UI.customSubMenu.style.overflowY = "hidden";
            }
            $UI.customSubMenu.style.display = "block";
            $UI.customSubMenu.style.transform = "scale("+1/(1+extraZoom/20)+")";
            $UI.customSubMenu.style.transformOrigin = "top left";
            $UI.customSubMenu.style.height = tmpHeight + "vh";
            $UI.customSubMenu.style.top = ((event.pageY +$UI.viewport.scrollTop)/(1+extraZoom/20)).toString() + "px";
            $UI.customSubMenu.style.left = ($UI.customMenu.offsetLeft + $UI.customSubMenu.offsetWidth/(1+extraZoom/20) + 1/(1+extraZoom/20)).toString()+"px";
            for (const subMenuOption of listData) {
                const listItem = document.createElement('li');
                listItem.innerText = subMenuOption.text;
                listItem.style.userSelect = "none";
                listItem.className = "custom-menu-element";
                listItem.onclick = () => {
                    subMenuOption.callback();
                    closeMenu();
                    closeSubMenu();
                }
                $UI.customSubMenu.appendChild(listItem);
            }

            if (event.pageY + $UI.customSubMenu.offsetHeight > window.innerHeight + window.pageYOffset) {
                $UI.customSubMenu.style.top = ((window.innerHeight +$UI.viewport.scrollTop - $UI.customSubMenu.offsetHeight - 4)/(1+extraZoom/20)).toString()+"px";
            }
            
            if (event.pageX + $UI.customMenu.offsetWidth + $UI.customSubMenu.offsetWidth >= window.innerWidth + window.pageXOffset - $UI.sideMenu.offsetWidth) {
                $UI.customSubMenu.style.left = ($UI.customMenu.offsetLeft - $UI.customSubMenu.offsetWidth/(1+extraZoom/20) - 1/(1+extraZoom/20)).toString()+"px";
            }
        }
    }

    function closeSubMenu() {
 $UI.customSubMenu.style.display = "none"; 
}
//#endregion

//#region Low level functions
function promptNumber(text:string, old?:number) {
    const input = prompt(text, old?.toString());
    if (input === null) {
        console.log("Cancelled input!");
        return null;
    }
    if (input === '') {
        console.log("Received invalid number!");
        return NaN;
    }
    return Number.parseFloat(input);
}

function promptInteger(text:string, old?:number) {
    const input = prompt(text, old?.toString());
    if (input === null) {
        console.log("Cancelled input!");
        return null;
    }
    if (input === '') {
        console.log("Received invalid int!");
        return NaN;
    }
    return parseInt(input);
}

function getChildren(element:HTMLElement) {
    const children = new Array<HTMLElement>();
    for (const child of element.children) {
        children.push((child as HTMLElement));
    }
    return children;
}

function getAncestry(el:HTMLElement) {
    const results = new Array<HTMLElement>();
    let current = el;
    do {
        results.push(current);
        if (current.parentElement === null) { return results; }
        current = current.parentElement;
    } while (current !== document.body);
    return results;
}

//#endregion

//#region Cookies
function setCookie(cname:string, cvalue:string) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname:string) {
    for(let c of document.cookie.split(';')) {
        c = c.trim()
        if (c.startsWith(cname))
            return c.substring(cname.length+1, c.length);
    }
    return "";
}
//#endregion

//#region Side menu stuff
function updateButtonColors() {
    $UI.toggleGrid.style.backgroundColor = flag.gridAlignMode ? (gridActive ? "#ffa5ff" : "#00a5ff") : (gridActive ? "#ffa500" : "");
    $UI.toggleSnap.style.backgroundColor = gridSnap ? "#ffa500" : "";
    updateColorPreview();
    if (isDM) {
        $UI.togglePlayerMode.style.backgroundColor = flag.playerMode ? "#ffa500" : "";
        $UI.toggleSettings.style.backgroundColor = displayMapSettings ? "#ffa500" : "";
        $UI.toggleBlockerEditing.style.backgroundColor = flag.blockerEditMode ? "#ffa500" : "";
        $UI.quickPolyButton.style.backgroundColor = flag.quickPolyBlockerMode ? "#ffa500" : "";
    }
}
//#endregion Side menu stuff