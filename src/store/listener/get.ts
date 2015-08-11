import Types = require("slownode");
import settings = require("../../settings");
export = get;

function get(event: string) {

    return settings.connection("listener")
        .select()
        .where("topic", "=", event)
        .innerJoin("function", "listener.funcId", "function.id");
}
