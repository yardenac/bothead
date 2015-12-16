var hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = function() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                if (   (source[key] === "")
                    || (source[key] === null)
                    || (source[key] === undefined)) continue
                target[key] = source[key]
            }
        }
    }

    return target
}
