<?php

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once(dirname(__FILE__).'/util.php');
require_once(dirname(__FILE__).'/../paymentlib.php');

global $DB;

$instanceid = $_GET['instanceid'];
$prepayToken = $_GET['prepaytoken'];

$instance = $DB->get_record('enrol', array('id' => $instanceid), '*', MUST_EXIST);
$correct_code = (trim($_GET['discountcode']) == trim($instance->customtext2));
$payment = null;

if($correct_code) {
    try {
        $payment = get_payment_from_token($prepayToken);
    } catch (Exception $e) {
        echo json_encode([ 'success' => false
                         , 'failmessage' => $e->getMessage() ]);
                         // , 'failmessage' => "Payment UUID ".$prepayToken." not found in database."]);
        die();
    }

    try {
        $payment->discounted = true;
        $DB->update_record('enrol_payment_ipn', $payment);
        $to_return = calculate_cost($instance, $payment);
    } catch (Exception $e) {
        echo json_encode([ 'success' => false
                         , 'failmessage' => "$e->getMessage"]);
        die();
    }

    $to_return["success"] = true;
    echo json_encode($to_return);
} else {
    echo json_encode([ "success" => false
                     , "failmessage" => get_string('incorrectdiscountcode_desc','enrol_payment')]);
}

?>
