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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InclusionProof = exports.InclusionProofProgram = exports.incrementalInclusionProof = exports.inclusionProof = void 0;
var o1js_1 = require("o1js");
var types_js_1 = require("./types.js");
var inclusionProof = function (witness, userParams) { return __awaiter(void 0, void 0, void 0, function () {
    var blindingPoint, liabilities, rootComm, rootHash, index, leftComm, rightComm, newComm, leftHash, rightHash, newHash;
    return __generator(this, function (_a) {
        blindingPoint = o1js_1.Group.generator.scale(o1js_1.Poseidon.hash(o1js_1.Group.generator.toFields()));
        liabilities = (0, o1js_1.Field)(0);
        userParams.balances.forEach(function (balance, index) {
            liabilities = liabilities.add(balance);
        });
        // assert that the net liability is positive
        o1js_1.Gadgets.rangeCheck64(liabilities);
        rootComm = o1js_1.Group.generator.scale(liabilities).add(blindingPoint.scale(userParams.blindingFactor));
        rootHash = o1js_1.Poseidon.hash([(0, o1js_1.Field)(10810197102n), (0, o1js_1.Field)(userParams.userId), userParams.userSecret]);
        // compute the user leaf
        //TODO: should this be here? doesn't `Provable.Array` always garantee the length will be 32?
        (0, o1js_1.assert)(witness.lefts.length == witness.path.length, "The path length and left array do not match");
        for (index = 0; index < 32; index++) {
            leftComm = o1js_1.Provable.if(witness.lefts[index], witness.path[index].commitment, rootComm);
            rightComm = o1js_1.Provable.if(witness.lefts[index], rootComm, witness.path[index].commitment);
            newComm = leftComm.add(rightComm);
            leftHash = o1js_1.Provable.if(witness.lefts[index], witness.path[index].hash, rootHash);
            rightHash = o1js_1.Provable.if(witness.lefts[index], rootHash, witness.path[index].hash);
            newHash = o1js_1.Poseidon.hash(__spreadArray(__spreadArray(__spreadArray([], leftComm.toFields(), true), rightComm.toFields(), true), [leftHash, rightHash], false));
            rootHash = o1js_1.Provable.if(newComm.equals(rootComm), rootHash, newHash);
            rootComm = newComm;
        }
        return [2 /*return*/, { publicOutput: new types_js_1.NodeContent({ commitment: rootComm, hash: rootHash }) }];
    });
}); };
exports.inclusionProof = inclusionProof;
// The incremental proof that verifies the liability inclusion of the previous proof also
var incrementalInclusionProof = function (witness, prevProof, userParams) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // verify the previous inclusion proof that was created
        prevProof.verify();
        return [2 /*return*/, (0, exports.inclusionProof)(witness, userParams)];
    });
}); };
exports.incrementalInclusionProof = incrementalInclusionProof;
exports.InclusionProofProgram = (0, o1js_1.ZkProgram)({
    name: 'Compute Root',
    publicInput: types_js_1.MerkleWitness,
    publicOutput: types_js_1.NodeContent,
    methods: {
        inclusionProof: {
            privateInputs: [types_js_1.UserParams],
            method: exports.inclusionProof
        },
        incrementalInclusionProof: {
            privateInputs: [(o1js_1.SelfProof), types_js_1.UserParams],
            method: exports.incrementalInclusionProof
        }
    }
});
var InclusionProof = /** @class */ (function (_super) {
    __extends(InclusionProof, _super);
    function InclusionProof() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return InclusionProof;
}(o1js_1.ZkProgram.Proof(exports.InclusionProofProgram)));
exports.InclusionProof = InclusionProof;
