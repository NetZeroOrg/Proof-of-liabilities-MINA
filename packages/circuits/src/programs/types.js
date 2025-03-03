"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleWitness = exports.NodeContent = exports.UserParams = void 0;
var o1js_1 = require("o1js");
var mina_attestations_1 = require("mina-attestations");
var UserParams = /** @class */ (function (_super) {
    __extends(UserParams, _super);
    function UserParams() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UserParams;
}((0, o1js_1.Struct)({
    // assuming a maximum of 1000 assets
    balances: (0, mina_attestations_1.DynamicArray)(o1js_1.Field, { maxLength: 1000 }),
    blindingFactor: o1js_1.Field,
    userId: o1js_1.Field,
    userSecret: o1js_1.Field
})));
exports.UserParams = UserParams;
var NodeContent = /** @class */ (function (_super) {
    __extends(NodeContent, _super);
    function NodeContent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NodeContent;
}((0, o1js_1.Struct)({
    commitment: o1js_1.Group,
    hash: o1js_1.Field
})));
exports.NodeContent = NodeContent;
/**
 * @param path: We assume that the max height of tree is 32 we can increase this if we want
 * @param root: The root for the tree
 */
var MerkleWitness = /** @class */ (function (_super) {
    __extends(MerkleWitness, _super);
    function MerkleWitness() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MerkleWitness;
}((0, o1js_1.Struct)({
    path: o1js_1.Provable.Array(NodeContent, 32),
    lefts: o1js_1.Provable.Array(o1js_1.Bool, 32)
})));
exports.MerkleWitness = MerkleWitness;
