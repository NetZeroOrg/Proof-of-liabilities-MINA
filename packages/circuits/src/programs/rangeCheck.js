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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RangeCheckProof = exports.rangeCheckProgram = void 0;
var o1js_1 = require("o1js");
exports.rangeCheckProgram = (0, o1js_1.ZkProgram)({
    name: "range proofs",
    methods: {
        base: {
            privateInputs: [o1js_1.Field],
            /**
             * The libaility sum is a value assumed to be in dollars it is rational to assume
             * that it does not exceeds 2^53 the max number. If the sum is composed of 1000 such
             * assets the sum would not exceed the number 2^(63) thus we can just check if the
             * total sum is less than 2^64.
             *
             * @param liabilitySum  The sum of all liabilities in dollars for the particular user
             */
            method: function (liabilitySum) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    o1js_1.Gadgets.rangeCheck64(liabilitySum);
                    return [2 /*return*/];
                });
            }); }
        },
        merge: {
            privateInputs: [o1js_1.SelfProof, o1js_1.SelfProof, o1js_1.Field],
            /**
             * This is the aggreagted range check for the liabilities of the user
             * @param lastProof The previous level proof
             */
            method: function (leftProof, rightProof, newSum) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    leftProof.verify();
                    rightProof.verify();
                    o1js_1.Gadgets.rangeCheck64(newSum);
                    return [2 /*return*/];
                });
            }); }
        }
    }
});
var RangeCheckProof = /** @class */ (function (_super) {
    __extends(RangeCheckProof, _super);
    function RangeCheckProof() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RangeCheckProof;
}(o1js_1.ZkProgram.Proof(exports.rangeCheckProgram)));
exports.RangeCheckProof = RangeCheckProof;
