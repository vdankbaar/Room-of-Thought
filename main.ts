import { Server } from 'socket.io';
import * as fs from 'fs';
import express, { Express } from 'express';
import * as http from 'http';
import * as uuid from "uuid";
//Mocht port 80 geblokeerd zijn door windows, voer de command 'net stop http' uit in een shell met admin of run unblock.bat in een shell met admin
const port = 80;
const checkFoldersInterval = 15000; //Set to -1 to disable

const app:Express = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

interface ServerToClientEvents {
    pingAt: (data:string) => void;
    currentMapData: (data:string) => void;
}

interface ClientToServerEvents {
    createNewMap: (data: {name:string}) => void; 

    changeTurn: (data: {id: ID}) => void;

    requestPing: (data:{pingX?:number, pingY?:number}) => void;

    switchBlockerType: (data:{type?:number}) => void;
    invertBlockers: () => void;
    
    setMapData: (data:{gridColor?:`#${string}`, map?:string, y?:number, x?:number, offsetX?:number, offsetY?:number, diagonalMovement?:string, system?:string}) => void;
    changeSelectedMap: (data:{selectedMap?:string}) => void;

    addDrawing: (data:{shape?:string, visible?:boolean, x?:number, y?:number, link?:ID, radius?:number,
        trueColor?:`#${string}`, width?:number, height?:number, verts?:tmpVert[],
        angle?:number, range?:number, is90Deg?:boolean}) => void;
    editDrawing: (data:{id?:ID, group?:number, verts?:Vert[], visible?:boolean, radius?:number,
        range?:number, x?:number, y?:number, both?:boolean, moveShapeGroup?:boolean, angle?:number}) => void;
    removeDrawing: (data:{id?:ID}) => void;
    
    addVert: (data:{id?:ID, vertID?:ID}) => void;
    editVert: (data:{id?:ID, vertID?:ID, x?:number, y?:number}) => void;
    removeVert: (data:{type?: 'blocker'|'line', id?:ID, vertID?:ID}) => void;

    addPolyBlocker: (data:{x?:number, y?:number, offset?:{min?:number}}) => void;
    addCustomPolyBlocker: (data:{newPolyBlockerVerts?:tmpVert[]}) => void;
    movePolyBlocker: (data:{id?:ID, offsetX?:number, offsetY?:number}) => void;
    togglePolyBlocker: (data:{id?:ID}) => void;
    removePolyBlocker: (data:{id?:ID}) => void;

    addBlocker: (data:{x?:number, y?:number, width?:number, height?:number}) => void;
    editBlocker: (data:{id?:ID, x?:number, y?:number, width?:number, height?:number}) => void;
    removeBlocker: (data:{id?:ID}) => void;
    
    createToken: (data:{size?:number, dm?:boolean, image?:string, text:string, x?:number, y?:number, concentrating?:boolean,
        status?:string, layer:number, group?:number, hideTracker?:boolean, hp?:`${number}/${number}`,
        notes?:string, initiative?:number, name?:string, ac?:number, hidden?:boolean}) => void;
    moveToken: (data:{id?:ID, x?:number, y?:number, bypassLink?:boolean}) => void;
    editToken: (data:{id?:ID, size?:number, status?:string, layer?:number, group?:number, text?:string,
        dm?:boolean, image?:string, hideTracker?:boolean, hp?:`${number}/${number}`, notes?:string,
        initiative?:number, name?:string, ac?:number, mentalDef?:number|null, physicalDef?:number|null,
        refDef?:number|null, fortDef?:number|null, willDef?:number|null, concentrating?:boolean}) => void;
    setTokenHidden: (data:{id?:ID, hidden?:boolean}) => void;
    removeToken: (data:{id?:ID}) => void;    

    switchTrackerPosition: (data:{origin?:ID, target?:ID}) => void;    
    sortTracker: () => void;

    clearTokens: () => void;
    clearDrawings: () => void;
    clearBlockers: () => void;
}

type ID = `${string}-${string}-${string}-${string}-${string}`;

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
    dm: boolean,
    layer: number,
    text: string
    image?: string,
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
}

interface Shape {
    id: ID,
    visible: boolean,
    shape: 'circle' | 'square' | 'cone' | '5ftLine' | 'vertexLine',
    trueColor: `#${string}`,
    group?: number,
    link?: ID,
    is90Deg?: boolean,
    verts?: Vert[],
    x?: number,
    y?: number,
    width?: number,
    radius?: number,
    height?: number,
    angle?: number,
    range?: number,
    //Added for backwards compatibility
    shapeGroup?: number,
    points?: Vert[],
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

const publicFolder = __dirname + "/client/public/";
let selectedMap = "currentSettings";
let currentMap:MapData;
loadCurrentMap();

if (checkFoldersInterval > 0) {
    setInterval(() => {
        currentMap.tokenList = readDirectory(publicFolder + "tokens", ["jpg", "png", "jpeg", "gif"]);
        currentMap.dmTokenList = readDirectory(publicFolder + "dmTokens", ["jpg", "png", "jpeg", "gif"]);
        currentMap.mapSourceList = readDirectory(publicFolder + "maps", ["jpg", "png", "jpeg", "gif", "webm", "mp4"]);
        currentMap.maps = readDirectory("data/", ["json"]).map((m) => m.split('.')[0]);
    }, checkFoldersInterval)    
}


app.use(express.static('client'));

io.on('connection', (socket) => {
    console.log('Client connected!');
    socket.emit('currentMapData', JSON.stringify(currentMap));

    socket.on('disconnect', () => {
        console.log('Client disconnected!');
    })

    socket.on('createNewMap', (body) => {
        const newMap:MapData = {
            blockerType: 1,
            gridColor: `#000000`,
            antiBlockerOn: false,
            maps: [],
            mapName: body.name,
            tokenList: [],
            dmTokenList: [],
            mapSourceList: [],
            map: 'White.png',
            x: 16,
            y: 9,
            offsetX: 0,
            offsetY: 0,
            tokens: [],
            drawings: [],
            polyBlockers: [],
            blockers: [],
            currentTurn: undefined,
            diagonalMovement: '5-10',
            system: 'standard',
        };
        writeFile(`data/${body.name}.json`, JSON.stringify(newMap));
        currentMap.maps = readDirectory("data/", ["json"]).map((m) => m.split('.')[0]);
        broadcastMap();
    })

    socket.on('changeTurn', (body) => {
        currentMap.currentTurn = body.id;
        broadcastMap();
        saveCurrentMap();
    })

    socket.on('setMapData', (body) => {
        if (body.map!=null) {currentMap.map = body.map;}
        if (body.x!=null) {currentMap.x = body.x;}
        if (body.y!=null) {currentMap.y = body.y;}
        if (body.offsetX!=null) {currentMap.offsetX = body.offsetX;}
        if (body.offsetY!=null) {currentMap.offsetY = body.offsetY;}
        if (body.gridColor!=null) {currentMap.gridColor = body.gridColor;}
        if (body.diagonalMovement!=null) {currentMap.diagonalMovement = body.diagonalMovement;}
        if (body.system!=null) {currentMap.system = body.system;}
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('changeSelectedMap', (body) => {
        if (body.selectedMap === undefined) {console.error('Missing!'); return;}
        selectedMap = body.selectedMap;
        loadCurrentMap();
        broadcastMap();
    });

    socket.on('createToken', (body) => {
        if (body.x === undefined) {console.error('Missing!'); return;}
        if (body.y === undefined) {console.error('Missing!'); return;}
        if (body.size === undefined) {console.error('Missing!'); return;}
        if (body.dm === undefined) {console.error('Missing!'); return;}
        if (body.x === undefined) {console.error('Missing!'); return;}
        if (body.size > 0 && body.size < 50) {
            const tmpToken:Token = {
                id: createUUID(),
                x: body.x,
                y: body.y,
                size: body.size,
                dm: body.dm,
                layer: body.layer,
                text: body.text,
                image: body.image,
                name: body.name,
                notes: body.notes,
                initiative: body.initiative,
                ac: body.ac,
                hp: body.hp,
                status: body.status,
                group: body.group,
                concentrating: body.concentrating,
                hideTracker: body.hideTracker,
                hidden: body.hidden,
            };
            currentMap.tokens.push(tmpToken);
            broadcastMap();
            saveCurrentMap();
        }
    });

    socket.on('setTokenHidden', (body) => {
        for (const currentToken of currentMap.tokens) {
            if (currentToken.id == body.id) {
                currentToken.hidden = body.hidden;
                for (const currentDrawing of currentMap.drawings)
                    if (currentDrawing.link == currentToken.id)
                        currentDrawing.visible = !currentToken.hidden;
            }
        }
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('editToken', (body) => {
        if (body.id === undefined) {console.error('Missing id!'); return;}
        const token = currentMap.tokens.find((t) => t.id == body.id);
        if (token === undefined) { console.error("Missing token!"); return; }
        if (body.size !== undefined) {
            if (body.size > 0 && body.size < 50) {
                for (const drawing of currentMap.drawings) {
                    if (drawing.link !== token.id || drawing.shape !== "circle") { continue; }
                    if (body.size === undefined) { console.error("Missing size!"); continue; }
                    if (drawing.radius === undefined) { console.error("Missing radius!"); continue; }
                    drawing.radius += (body.size-token.size)*0.5;
                }
                token.size = body.size;
            }
        }
        if (body.status !== undefined) {token.status = body.status;}     
        if (body.layer !== undefined) {token.layer = body.layer;}
        if (body.notes !== undefined) {token.notes = body.notes;}
        if (body.text !== undefined) {token.text = body.text;}    
        if (body.dm !== undefined) {token.dm = body.dm;}
        if (body.concentrating !== undefined) {token.concentrating = body.concentrating;}
        if (body.hideTracker !== undefined) {token.hideTracker = body.hideTracker;}
        // Following parameters contain a ternary statement to allow resetting through a "" or false value.
        if (body.group !== undefined) {token.group = body.group ?? undefined;}    
        if (body.initiative !== undefined) {token.initiative = body.initiative ?? undefined;}
        if (body.name !== undefined) {token.name = body.name ?? undefined;}
        if (body.ac !== undefined) {token.ac = body.ac ?? undefined;}
        if (body.mentalDef !== undefined) {token.mentalDef = body.mentalDef ?? undefined;}
        if (body.physicalDef !== undefined) {token.physicalDef = body.physicalDef ?? undefined;}
        if (body.refDef !== undefined) {token.refDef = body.refDef ?? undefined;}
        if (body.fortDef !== undefined) {token.fortDef = body.fortDef ?? undefined;}
        if (body.willDef !== undefined) {token.willDef = body.willDef ?? undefined;}
        if (body.hp !== undefined) {token.hp = body.hp}
        if (body.image !== undefined) {token.image = body.image ?? undefined;}
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('removeToken', (body) => {
        currentMap.tokens = currentMap.tokens.filter(token => token.id !== body.id);
        currentMap.drawings = currentMap.drawings.filter(drawing => drawing.link !== body.id);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('moveToken', (body) => {
        if (body.x === undefined) { console.error("Missing x!"); return; }
        if (body.y === undefined) { console.error("Missing Y!"); return; }
        const currentToken = currentMap.tokens.find((t) => t.id === body.id);
        if (currentToken === undefined) { console.error("Could not find token!"); return; }
        const dx = body.x - currentToken.x;
        const dy = body.y - currentToken.y;
        if (currentToken.group != null && !body.bypassLink) {
            for (const otherToken of currentMap.tokens) {
                if (currentToken.id === otherToken.id || otherToken.group !== currentToken.group) { continue; }
                otherToken.x += dx;
                otherToken.y += dy;
                moveLinkedShapes(otherToken);
            }
        }
        currentToken.x = body.x;
        currentToken.y = body.y;
        moveLinkedShapes(currentToken);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('addDrawing', (body) => {
        if (body.shape === undefined) { console.error('Missing shape!'); return; }
        if (body.trueColor === undefined) { console.error('Missing trueColor!'); return; }
        if (body.visible === undefined) { console.error('Missing visible!'); return; }
        let tmpDrawing:Shape;
        switch(body.shape) {
            case "circle":
                if (body.x === undefined) { console.error("Missing x!"); return; }
                if (body.y === undefined) { console.error("Missing y!"); return; }
                if (body.radius === undefined) { console.error("Missing radius!"); return;}
                tmpDrawing = {
                    id: createUUID(),
                    shape: body.shape,
                    visible: body.visible,
                    trueColor: body.trueColor,
                    x: Math.round(body.x),
                    y: Math.round(body.y),
                    radius: body.radius,
                    link: body.link,
                };
                break;
            case "square":
                if (body.x === undefined) { console.error("Missing x!"); return; }
                if (body.y === undefined) { console.error("Missing y!"); return; }
                if (body.width === undefined) { console.error("Missing width!"); return; }
                if (body.height === undefined) { console.error("Missing height!"); return; }
                tmpDrawing = {
                    id: createUUID(),
                    shape: body.shape,
                    visible: body.visible,
                    trueColor: body.trueColor,
                    x: Math.round(body.x),
                    y: Math.round(body.y),
                    width: Math.round(body.width),
                    height: Math.round(body.height),
                    link: body.link,
                }
                break;
            case "vertexLine":
                if (body.verts === undefined) { console.error("Missing verts!"); return; }
                tmpDrawing = {
                    id: createUUID(),
                    shape: body.shape,
                    visible: body.visible,
                    trueColor: body.trueColor,
                    verts: body.verts.map((p) => {
                        return {id: createUUID(), x: p.x, y: p.y} as Vert
                    }),
                    link: body.link,
                }
                break;
            case "5ftLine":
                if (body.x === undefined) { console.error("Missing x!"); return; }
                if (body.y === undefined) { console.error("Missing y!"); return; }
                if (body.range === undefined) { console.error("Missing range!"); return; }
                if (body.angle === undefined) { console.error("Missing angle!"); return; }
                tmpDrawing = {
                    id: createUUID(),
                    shape: body.shape,
                    visible: body.visible,
                    trueColor: body.trueColor,
                    x: Math.round(body.x),
                    y: Math.round(body.y),
                    range: body.range,
                    angle: body.angle,
                    link: body.link,
                }
                break;
            case "cone":
                if (body.x === undefined) { console.error("Missing x!"); return; }
                if (body.y === undefined) { console.error("Missing y!"); return; }
                if (body.is90Deg === undefined) { console.error("Missing is90Deg!"); return; }
                if (body.angle === undefined) { console.error("Missing angle!"); return; }
                if (body.range === undefined) { console.error("Missing range!"); return; }
                tmpDrawing = {
                    id: createUUID(),
                    shape: body.shape,
                    visible: body.visible,
                    trueColor: body.trueColor,
                    x: Math.round(body.x),
                    y: Math.round(body.y),
                    is90Deg: body.is90Deg,
                    angle: body.angle,
                    range: body.range,
                    link: body.link,
                }
                break;
            default:
                console.error("Tried to create non existing shape!");
                return;
        }
        currentMap.drawings.push(tmpDrawing);
        for (const token of currentMap.tokens) {
            moveLinkedShapes(token);
        }
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('editDrawing', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        const currentDrawing = currentMap.drawings.find((d) => d.id === body.id);
        if (currentDrawing === undefined) { console.error("Could not find drawing!"); return; }
        if (currentDrawing.shape == "vertexLine" && body.both) {
            if (body.x === undefined) { console.error("Missing x!"); return; }
            if (body.y === undefined) { console.error("Missing y!"); return; }
            if (currentDrawing.verts === undefined) { console.error("Missing x!"); return; }
            const dx = body.x - currentDrawing.verts[0].x;
            const dy = body.y - currentDrawing.verts[0].y;
            currentDrawing.verts.forEach((v) => {
                v.x += dx;
                v.y += dy;
            });
            if (currentDrawing.group !== undefined) {
                moveShapeGroup(currentDrawing.id, dx, dy, currentDrawing.group);
            }            
        } else {
            if (body.verts !== undefined) { currentDrawing.verts = body.verts; }
            if (body.radius !== undefined) { currentDrawing.radius = body.radius; }
            if (body.angle !== undefined) { currentDrawing.angle = body.angle; }
            if (body.range !== undefined) { currentDrawing.range = body.range; }
            if (body.x !== undefined && body.y !== undefined) {
                if (currentDrawing.group !== undefined && currentDrawing.x !== undefined && currentDrawing.y !== undefined) {
                    moveShapeGroup(currentDrawing.id, body.x - currentDrawing.x, body.y - currentDrawing.y, currentDrawing.group);
                }   
            }
            if (body.x !== undefined) { currentDrawing.x = Math.round(body.x); }
            if (body.y !== undefined) { currentDrawing.y = Math.round(body.y); }
        }
        if (body.group !== undefined) { currentDrawing.group = body.group; }
        if (body.visible !== undefined) { currentDrawing.visible = body.visible; }
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('removeDrawing', (body) => {
        currentMap.drawings = currentMap.drawings.filter(drawing => drawing.id !== body.id);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('addBlocker', (body) => {
        if (body.x === undefined) { console.error("Missing x!"); return; }
        if (body.y === undefined) { console.error("Missing y!"); return; }
        if (body.width === undefined) { console.error("Missing width!"); return; }
        if (body.height === undefined) { console.error("Missing height!"); return; }
        if (body.width == 0 && body.height == 0) { return; }
        currentMap.blockers.push({
            id: createUUID(),
            x: Math.min(body.x, body.x + body.width),
            y: Math.min(body.y, body.y + body.height),
            width: Math.abs(body.width),
            height: Math.abs(body.height),
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('editBlocker', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        const currentBlocker = currentMap.blockers.find((b) => b.id === body.id);
        if (currentBlocker === undefined) { console.error("Missing currentBlocker!"); return; }
        if (body.x !== undefined) { currentBlocker.x = body.x; }
        if (body.y !== undefined) { currentBlocker.y = body.y; }
        if (body.width !== undefined) { currentBlocker.width = body.width; }
        if (body.height !== undefined) { currentBlocker.height = body.height; }
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('removeBlocker', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        currentMap.blockers = currentMap.blockers.filter((b) => b.id !== body.id);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('addPolyBlocker', (body) => {
        if (body.x === undefined) { console.error("Missing x!"); return; }
        if (body.y === undefined) { console.error("Missingyd!"); return; }
        if (body.offset === undefined) { console.error("Missing offset!"); return; }
        if (body.offset.min === undefined) { console.error("Missing offset.min!"); return; }
        currentMap.polyBlockers.push({
            id: createUUID(),
            inactive: false,
            verts: [
                {id: createUUID(), x: body.x-body.offset.min, y: body.y+body.offset.min},
                {id: createUUID(), x: body.x+body.offset.min, y: body.y+body.offset.min},
                {id: createUUID(), x: body.x+body.offset.min, y: body.y-body.offset.min},
                {id: createUUID(), x: body.x-body.offset.min, y: body.y-body.offset.min},
            ],
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('togglePolyBlocker', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        const currentBlocker = currentMap.polyBlockers.find((p) => p.id === body.id);
        if (currentBlocker === undefined) { console.error("Missing currentBlocker!"); return; }
        currentBlocker.inactive = !currentBlocker.inactive;
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('editVert', (body) => {
        if (body.x === undefined) { console.error("Missing x!"); return; }
        if (body.y === undefined) { console.error("Missing y!"); return; }
        if (body.id === undefined) { console.error("Missing id!"); return; }
        if (body.vertID === undefined) { console.error("Missing vertID!"); return; }
        const currentBlocker = currentMap.polyBlockers.find((p) => p.id === body.id);
        if (currentBlocker === undefined) { console.error("Missing currentBlocker!"); return; }
        const currentVert = currentBlocker.verts.find((v) => v.id === body.vertID);
        if (currentVert === undefined) { console.error("Missing currentVert!"); return; }
        currentVert.x = body.x;
        currentVert.y = body.y;
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('movePolyBlocker', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        if (body.offsetX === undefined) { console.error("Missing offsetX!"); return; }
        const dx:number = body.offsetX;
        if (body.offsetY === undefined) { console.error("Missing offsetY!"); return; }
        const dy:number = body.offsetY;
        const currentBlocker = currentMap.polyBlockers.find((p) => p.id === body.id);
        if (currentBlocker === undefined) { console.error("Missing currentBlocker!"); return; }
        currentBlocker.verts.forEach((v) => {
            v.x += dx;
            v.y += dy;
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('addCustomPolyBlocker', (body) => {
        if (body.newPolyBlockerVerts === undefined) { console.error("Missing newPolyBlockerVerts!"); return; }
        currentMap.polyBlockers.push({
            id: createUUID(),
            verts: body.newPolyBlockerVerts.map((v) => {
                return {id: createUUID(), x: v.x, y: v.y} as Vert;
            }),
            inactive: false,
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('addVert', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        const currentBlocker = currentMap.polyBlockers.find((p) => p.id === body.id);
        if (currentBlocker === undefined) { console.error("Missing currentBlocker!"); return; }
        if (body.vertID === undefined) { console.error("Missing vertID!"); return; }
        const prevVert = currentBlocker.verts.find((v) => v.id === body.vertID);
        if (prevVert === undefined) { console.error("Missing prevVert!"); return; }
        const index = (currentBlocker.verts.indexOf(prevVert)+1)%currentBlocker.verts.length;
        const nextVert = currentBlocker.verts[index];
        currentBlocker.verts.splice(index, 0, {
            id: createUUID(),
            x: (prevVert.x+nextVert.x)/2,
            y: (prevVert.y+nextVert.y)/2
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('removeVert', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        if (body.type === undefined) { console.error("Missing id!"); return; }
        let obj;
        switch (body.type) {
            case 'blocker': 
                obj = currentMap.polyBlockers.find((p) => p.id === body.id);
                if (obj?.verts === undefined) { console.error("Blocker not found!"); return;}
                break;
            case 'line' :
                obj = currentMap.drawings.find((p) => p.id === body.id);
                if (obj?.verts === undefined) { console.error("Shape not found!"); return;}
                break;
            default:
                console.error(`Tried to remove vert from non existing object`);
                break;
        }
        if (obj === undefined) { console.error("Missing currentBlocker!"); return; }
        if (body.vertID === undefined) { console.error("Missing vertID!"); return; }
        obj.verts = obj.verts?.filter((v) => v.id !== body.vertID);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('removePolyBlocker', (body) => {
        if (body.id === undefined) { console.error("Missing id!"); return; }
        currentMap.polyBlockers = currentMap.polyBlockers.filter((p) => p.id !== body.id);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('invertBlockers', () => {
        currentMap.antiBlockerOn = !currentMap.antiBlockerOn;
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('clearTokens', () => {
        currentMap.tokens = [];
        currentMap.drawings = currentMap.drawings.filter((d) => d.link === undefined);
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('clearDrawings', () => {
        currentMap.drawings = [];
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('clearBlockers', () => {
        currentMap.blockers = [];
        currentMap.polyBlockers = [];
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('sortTracker', () => {
        if (currentMap.tokens.length<=0) { return; }
        currentMap.tokens = currentMap.tokens.sort((a,b) => {
            if (a.initiative === undefined) { return 1; }
            if (b.initiative === undefined) { return -1; }
            return  b.initiative - a.initiative;
        });
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('switchTrackerPosition', (body) => {
        if (body.origin === undefined) { console.error("Missing origin!"); return; }
        if (body.target === undefined) { console.error("Missing target!"); return; }
        const oi = currentMap.tokens.findIndex((t) => t.id === body.origin);
        const ti = currentMap.tokens.findIndex((t) => t.id === body.target);
        [currentMap.tokens[oi], currentMap.tokens[ti]] = [currentMap.tokens[ti], currentMap.tokens[oi]];
        broadcastMap();
        saveCurrentMap();
    });

    socket.on('switchBlockerType', (body) => {
        if (body.type === undefined) { console.error("Missing type!"); return; }
        currentMap.blockerType = body.type;
        broadcastMap();
        saveCurrentMap();
    })

    socket.on('requestPing', (body) => {
        io.sockets.emit('pingAt', JSON.stringify({pingX: body.pingX, pingY: body.pingY}));
    });
})

server.listen(port);

function moveShapeGroup(moveShapeOriginId:ID, dx:number, dy:number, targetShapeGroup:number) {
    for (const drawing of currentMap.drawings) {
        if (drawing.group !== targetShapeGroup || drawing.id === moveShapeOriginId || drawing.link !== undefined) { continue; }
        if (drawing.shape === "vertexLine") {
            if (drawing.verts === undefined) { console.error("Missing verts!"); continue; }
            for (const point of drawing.verts) {
                point.x += dx;
                point.y += dy;
            }
            continue;
        }
        if (drawing.x === undefined) { console.error("Missing x!"); continue; }
        if (drawing.y === undefined) { console.error("Missing y!"); continue; }
        drawing.x += dx;
        drawing.y += dy;
    }
}

function moveLinkedShapes(token:Token) {
    for (const drawing of currentMap.drawings) {
        if (drawing.link !== token.id) { continue; }
        if (drawing.x === undefined) { console.error("Missing x!"); continue; }
        if (drawing.y === undefined) { console.error("Missing y!"); continue; }
        if (drawing.group) {
            const dx = token.x - drawing.x;
            const dy = token.y - drawing.y;
            moveShapeGroup(drawing.id, dx, dy, drawing.group);
        }        
        drawing.x = token.x;
        drawing.y = token.y;
    }
}

function loadCurrentMap() {
    currentMap = JSON.parse(readFile(`data/${selectedMap}.json`)) as MapData;
    if (currentMap.antiBlockerOn === undefined) { console.error("Missing antiBlockerOn!"); return; }
    if (currentMap.blockerType === undefined) { console.error("Missing blockerType!"); return; }
    if (currentMap.gridColor === undefined) { console.error("Missing gridColor!"); return; }
    if (currentMap.maps === undefined) { console.error("Missing maps!"); return; }
    if (currentMap.map === undefined) { console.error("Missing map!"); return; }
    if (currentMap.x === undefined) { console.error("Missing x!"); return; }
    if (currentMap.y === undefined) { console.error("Missing y!"); return; }
    if (currentMap.offsetX === undefined) { console.error("Missing offsetX!"); return; }
    if (currentMap.offsetY === undefined) { console.error("Missing offsetY!"); return; }
    if (currentMap.tokens === undefined) { console.error("Missing tokens!"); return; }
    if (currentMap.drawings === undefined) { console.error("Missing drawings!"); return; }
    if (currentMap.polyBlockers === undefined) { console.error("Missing polyBlockers!"); return; }
    //Functions below are used to convert JSON files from old RoT versions to this version
    let fixedOldJSON = false;
    for (const token of currentMap.tokens) {
        const t = token.id as number|ID;
        if (typeof t === 'number') {
            token.id = `00001-${token.id}-${token.id}-${token.id}-${token.id}`;
            fixedOldJSON = true;
        }
    }
    for (const drawing of currentMap.drawings) {
        const d = drawing.id as number|ID;
        if (typeof d === 'number') {
            drawing.id = `00002-${drawing.id}-${drawing.id}-${drawing.id}-${drawing.id}`;
            fixedOldJSON = true;
        }
        const dLink = drawing.link as number|ID;
        if (typeof dLink === 'number') {
            drawing.link = `00001-${drawing.link}-${drawing.link}-${drawing.link}-${drawing.link}`;
            fixedOldJSON = true;
        }
        if (drawing.shapeGroup !== undefined) {
            drawing.group = drawing.shapeGroup;
            drawing.shapeGroup = undefined;
            fixedOldJSON = true;
        }
        if (drawing.points !== undefined) {
            drawing.verts = drawing.points;
            drawing.points = undefined;
            fixedOldJSON = true;
        }
    }
    for (const blocker of currentMap.blockers) {
        const b = blocker.id as number|ID;
        if (typeof b === 'number') {
            blocker.id = `00003-${blocker.id}-${blocker.id}-${blocker.id}-${blocker.id}`;
            fixedOldJSON = true;
        }
    }
    for (const blocker of currentMap.polyBlockers) {
        const b = blocker.id as number|ID;
        if (typeof b === 'number') {
            blocker.id = `00004-${blocker.id}-${blocker.id}-${blocker.id}-${blocker.id}`;
            fixedOldJSON = true;
        }
        for (const vert of blocker.verts) {
            if (vert.id === undefined) {
                vert.id = createUUID();
                fixedOldJSON = true;
            }
        }
    }
    currentMap.mapName = selectedMap;
    currentMap.tokenList = readDirectory(publicFolder + "tokens", ["jpg", "png", "jpeg", "gif"]);
    currentMap.dmTokenList = readDirectory(publicFolder + "dmTokens", ["jpg", "png", "jpeg", "gif"]);
    currentMap.mapSourceList = readDirectory(publicFolder + "maps", ["jpg", "png", "jpeg", "gif", "webm", "mp4"]);
    currentMap.maps = readDirectory("data/", ["json"]).map((m) => m.split('.')[0]);
    if (fixedOldJSON) {
        saveCurrentMap();
    }
}

function broadcastMap() {
    io.sockets.emit('currentMapData', JSON.stringify(currentMap));
}

function saveCurrentMap() {   
    writeFile("data/" + selectedMap + ".json", JSON.stringify(currentMap, null, 4));
}

//#region Low level functions
function createUUID() {
    return uuid.v4() as `${string}-${string}-${string}-${string}-${string}`;
}

function readFile(file:string) {
    //Function that synchronously reads a file
    let fileTries = 0;
    while (fileTries < 5) {
        try { 
            const data = fs.readFileSync(file, 'utf8');
            fileTries = 0;
            return data;
        } catch (err) {
            console.error("Error: ", err);
            fileTries++;
        }
    }
    return '';
}

function writeFile(file:string, content:string) {
    //Function that synchronously writes a file
    try { fs.writeFileSync(file, content, 'utf8'); } catch(err) { console.error("Error: ", err); return false;}
    return true;
}

function fileExists(file:string) {
    try { return fs.existsSync(file); } catch(err) { console.error("Error: ", err);}
}


function readDirectory(path:string, fileTypes:string[]) {
    if (!fileExists(path)) { return []; }
    try {
        const dirData = fs.readdirSync(path, {withFileTypes: false});
        return dirData.filter((f) => fileTypes.some((t) => f.includes(t)));
    } catch (err) {
        console.error("Error: ", err);
        return [];
    }
}

//#endregion