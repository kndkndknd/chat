export function selectOtherClient(rooms, source) {
    let targetArr = [];
    for (let id in rooms) {
        targetArr.push(String(source));
    }
    if (targetArr.length > 1) {
        targetArr.splice(targetArr.indexOf(String(source)), 1);
    }
    const target = targetArr[Math.floor(Math.random() * targetArr.length)];
    let targetID = String(rooms[0]);
    for (let id in rooms) {
        if (target === String(id))
            targetID = id;
    }
    return targetID;
}
export function roomEmit(io, func, arg, target) {
    for (let key in target) {
        if (key in io.sockets.adapter.rooms) {
            io.to(key).emit(func, arg);
        }
        else if (key === "all") {
            io.emit(func, arg);
        }
    }
}
export function pickupTarget(io, list, sourceId) {
    let idArr = [];
    let idStrArr = [];
    if (io.sockets.adapter.rooms !== undefined) {
        const room = io.sockets.adapter.rooms;
        for (let key in list) {
            for (let id in room) {
                if (list[key] != undefined && String(id) === key) { //client*streamのルーティングをやめた、いったん
                    idArr.push(id);
                    idStrArr.push(String(id));
                }
            }
        }
        if (sourceId in idStrArr) {
            idArr.splice(idArr.indexOf(sourceId), 1);
        }
    }
    return idArr;
}
export function pickCmdTarget(idHsh, cmd, room = "all") {
    let targetArr = { "id": [], "No": [], "cmd": [], "timestamp": [], "noneId": [], "targetId": "none", "duplicate": "none" };
    //console.log(cmd)
    for (let strId in idHsh) {
        //console.log(strId)
        //console.log(idHsh[strId].cmd)
        if (room === "all" || idHsh[strId].room === room) {
            if (!idHsh[strId].standalone && (room === "all" || idHsh[strId].room === room)) {
                targetArr.id.push(strId);
            }
            targetArr.No.push(idHsh[strId].No);
            if (cmd != undefined) {
                targetArr.cmd.push(idHsh[strId].cmd.cmd);
                targetArr.timestamp.push(Number(idHsh[strId].cmd.timestamp));
                if (idHsh[strId].cmd.cmd === "none")
                    targetArr.noneId.push(strId);
                if (idHsh[strId].cmd.cmd === cmd.cmd || idHsh[strId].cmd.cmd === cmd.property)
                    targetArr.duplicate = strId;
            }
            console.log(idHsh[strId].room);
        }
    }
    if (targetArr.duplicate != "none") {
        targetArr.targetId = targetArr.duplicate;
    }
    else if (targetArr.noneId.length > 0) {
        targetArr.targetId = targetArr.noneId[Math.floor(Math.random() * targetArr.noneId.length)];
    }
    else {
        //console.log(targetArr.timestamp)
        targetArr.targetId = targetArr.id[targetArr.timestamp.indexOf(Math.min.apply(null, targetArr.timestamp))];
    }
    return targetArr.targetId;
}
export function cmdSelect(strings, statusList) {
    let cmd = { cmd: "" };
    let nowFlag = false;
    for (let key in statusList["cmd"]["list"]) {
        if (strings === key) {
            cmd = { "cmd": statusList["cmd"]["list"][key], overlay: true };
            // cmd.overlay = true
            if (statusList["cmd"]["now"][cmd["cmd"]]) {
                //statusList["cmd"]["now"][cmd["cmd"]] = false
                nowFlag = false;
            }
            else {
                //statusList["cmd"]["now"][cmd["cmd"]] = true
                nowFlag = true;
            }
        }
    }
    return { cmd: cmd, flag: nowFlag };
}
//# sourceMappingURL=route.js.map