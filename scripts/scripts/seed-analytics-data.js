"use strict";
/**
 * Seed Analytics Data Script
 *
 * Populates the Supabase database with realistic demo data for analytics:
 * - Campaign costs (design, print, postage)
 * - Events (QR scans, page views) with timestamps
 * - Conversions (form submissions, appointments) with timestamps
 * - Complete campaign journey timeline
 */
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
var server_1 = require("../lib/supabase/server");
function seedAnalyticsData() {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, _a, campaigns, campaignsError, _i, campaigns_1, campaign, recipientCount, costDesign, costPrintPerPiece, costPostagePerPiece, costDataAxlePerPiece, costPrint, costPostage, costDataAxle, costTotal, updateCostError, _b, recipients, recipientsError, campaignCreatedAt, campaignSentAt, numScans, scannedRecipients, eventsCreated, conversionsCreated, i, recipient, daysAfterSent, hoursOffset, minutesOffset, qrScanTime, qrScanError, pageViewTime, pageViewError, willConvert, conversionTime, conversionTypes, conversionType, conversionError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    supabase = (0, server_1.createServiceClient)();
                    console.log('🌱 Starting analytics data seeding...\n');
                    return [4 /*yield*/, supabase
                            .from('campaigns')
                            .select('id, name, total_recipients, created_at, status')
                            .order('created_at', { ascending: false })
                            .limit(5)];
                case 1:
                    _a = _c.sent(), campaigns = _a.data, campaignsError = _a.error;
                    if (campaignsError || !campaigns || campaigns.length === 0) {
                        console.error('❌ Error fetching campaigns:', campaignsError);
                        return [2 /*return*/];
                    }
                    console.log("\u2705 Found ".concat(campaigns.length, " campaigns\n"));
                    _i = 0, campaigns_1 = campaigns;
                    _c.label = 2;
                case 2:
                    if (!(_i < campaigns_1.length)) return [3 /*break*/, 12];
                    campaign = campaigns_1[_i];
                    console.log("\uD83D\uDCCA Processing campaign: ".concat(campaign.name, " (").concat(campaign.total_recipients, " recipients)"));
                    recipientCount = campaign.total_recipients || 5;
                    costDesign = 50.00;
                    costPrintPerPiece = 0.85;
                    costPostagePerPiece = 0.56;
                    costDataAxlePerPiece = 0.10;
                    costPrint = costPrintPerPiece * recipientCount;
                    costPostage = costPostagePerPiece * recipientCount;
                    costDataAxle = costDataAxlePerPiece * recipientCount;
                    costTotal = costDesign + costPrint + costPostage + costDataAxle;
                    return [4 /*yield*/, supabase
                            .from('campaigns')
                            .update({
                            cost_design: costDesign,
                            cost_print: costPrint,
                            cost_postage: costPostage,
                            cost_data_axle: costDataAxle,
                            cost_total: costTotal,
                            sent_at: new Date(new Date(campaign.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day after creation
                        })
                            .eq('id', campaign.id)];
                case 3:
                    updateCostError = (_c.sent()).error;
                    if (updateCostError) {
                        console.error("  \u274C Error updating costs:", updateCostError.message);
                        return [3 /*break*/, 11];
                    }
                    console.log("  \u2705 Updated costs: $".concat(costTotal.toFixed(2), " total ($").concat((costTotal / recipientCount).toFixed(2), " per piece)"));
                    return [4 /*yield*/, supabase
                            .from('campaign_recipients')
                            .select('id, created_at')
                            .eq('campaign_id', campaign.id)];
                case 4:
                    _b = _c.sent(), recipients = _b.data, recipientsError = _b.error;
                    if (recipientsError || !recipients || recipients.length === 0) {
                        console.log("  \u26A0\uFE0F  No recipients found, skipping events/conversions");
                        return [3 /*break*/, 11];
                    }
                    console.log("  \u2705 Found ".concat(recipients.length, " recipients"));
                    campaignCreatedAt = new Date(campaign.created_at);
                    campaignSentAt = new Date(campaignCreatedAt.getTime() + 24 * 60 * 60 * 1000);
                    numScans = Math.floor(recipients.length * 0.6);
                    scannedRecipients = recipients.slice(0, numScans);
                    eventsCreated = 0;
                    conversionsCreated = 0;
                    i = 0;
                    _c.label = 5;
                case 5:
                    if (!(i < scannedRecipients.length)) return [3 /*break*/, 10];
                    recipient = scannedRecipients[i];
                    daysAfterSent = 2 + Math.floor(Math.random() * 8);
                    hoursOffset = Math.floor(Math.random() * 24);
                    minutesOffset = Math.floor(Math.random() * 60);
                    qrScanTime = new Date(campaignSentAt.getTime() +
                        (daysAfterSent * 24 * 60 * 60 * 1000) +
                        (hoursOffset * 60 * 60 * 1000) +
                        (minutesOffset * 60 * 1000));
                    return [4 /*yield*/, supabase
                            .from('events')
                            .insert({
                            campaign_id: campaign.id,
                            recipient_id: recipient.id,
                            event_type: 'qr_scan',
                            created_at: qrScanTime.toISOString(),
                        })];
                case 6:
                    qrScanError = (_c.sent()).error;
                    if (!!qrScanError) return [3 /*break*/, 9];
                    eventsCreated++;
                    pageViewTime = new Date(qrScanTime.getTime() + (1000 + Math.floor(Math.random() * 29000)));
                    return [4 /*yield*/, supabase
                            .from('events')
                            .insert({
                            campaign_id: campaign.id,
                            recipient_id: recipient.id,
                            event_type: 'page_view',
                            created_at: pageViewTime.toISOString(),
                        })];
                case 7:
                    pageViewError = (_c.sent()).error;
                    if (!!pageViewError) return [3 /*break*/, 9];
                    eventsCreated++;
                    willConvert = Math.random() < 0.3;
                    if (!willConvert) return [3 /*break*/, 9];
                    conversionTime = new Date(pageViewTime.getTime() +
                        (30000 + Math.floor(Math.random() * 270000)) // 30s - 5min
                    );
                    conversionTypes = ['form_submission', 'appointment_booked', 'phone_call'];
                    conversionType = conversionTypes[Math.floor(Math.random() * conversionTypes.length)];
                    return [4 /*yield*/, supabase
                            .from('conversions')
                            .insert({
                            campaign_id: campaign.id,
                            recipient_id: recipient.id,
                            conversion_type: conversionType,
                            created_at: conversionTime.toISOString(),
                        })];
                case 8:
                    conversionError = (_c.sent()).error;
                    if (!conversionError) {
                        conversionsCreated++;
                    }
                    _c.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 5];
                case 10:
                    console.log("  \u2705 Created ".concat(eventsCreated, " events (").concat(numScans, " QR scans, ").concat(numScans, " page views)"));
                    console.log("  \u2705 Created ".concat(conversionsCreated, " conversions\n"));
                    _c.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12:
                    console.log('✨ Analytics data seeding complete!\n');
                    console.log('📈 Summary:');
                    console.log("   - Campaigns updated with realistic costs");
                    console.log("   - Events created with proper timestamps");
                    console.log("   - Conversions created with proper timestamps");
                    console.log("   - Complete campaign journey timeline established\n");
                    return [2 /*return*/];
            }
        });
    });
}
// Run the seeding script
seedAnalyticsData()
    .then(function () {
    console.log('✅ Script completed successfully');
    process.exit(0);
})
    .catch(function (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
