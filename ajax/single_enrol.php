<?php

/**
 * Modify payment data - set to a single enrollment
 */

require_once('../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('../lang/en/enrol_ecommerce.php');

global $DB;

$paymentUUID = $_GET['paymentuuid'];

$ret = array();

try {
    $payment = $DB->get_record('enrol_ecommerce_ipn', ['uuid' => $paymentUUID], '*', MUST_EXIST);;
    update_payment_data(false, null, $payment,$ret);
} catch (Exception $e) {
    $ret["success"] = false;
    $ret["failmessage"] = "Payment UUID ".$paymentUUID." not found in database.";
}

echo json_encode($ret);
