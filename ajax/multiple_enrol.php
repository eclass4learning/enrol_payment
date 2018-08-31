<?php

require_once('../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('../lang/en/enrol_ecommerce.php');
require_once('../multipleenrollib.php');
require_once('../discountlib.php');

global $DB;

$ret = array("success" => true);
$emails = json_decode(stripslashes($_POST['emails']));
$instanceid = $_POST['instanceid'];
$paymentUUID = $_POST['paymentuuid'];
$ipn_id = $_POST['ipn_id'];

if ($CFG->allowaccountssameemail) {
    $ret["success"] = false;
    $ret["failreason"] = "allowaccountssameemail";
    $ret["failmessage"] = get_string("sameemailaccountsallowed", "enrol_ecommerce");
} else if (count($emails) != count(array_unique($emails))) {
    $ret["success"] = false;
    $ret["failreason"] = "duplicateemail";
    $ret["failmessage"] = get_string("duplicateemail", "enrol_ecommerce");
} else {

    if(!$ret["success"]) {
        echo json_encode($ret);
        die();
    }

    try {
        $ret["users"] = get_moodle_users_by_emails($emails, $ret);
        update_payment_data($ret['users'], $ipn_id, $ret);

        $instance = $DB->get_record('enrol', array("id" => $instanceid), '*', MUST_EXIST);
        $payment = $DB->get_record('enrol_ecommerce_ipn', array("uuid" => $paymentUUID), '*', MUST_EXIST);

        //Tack new subtotals onto return data
        $ret = array_merge($ret, calculate_cost($instance, $payment)); 

        $ret["successmessage"] = 
            get_string("multipleregistrationconfirmuserlist", "enrol_ecommerce")
          . implode("<li>", array_map("pretty_print_user", $ret["users"]));

    } catch (Exception $e) {
        $ret["success"] = false;
        $ret["failmessage"] = $e->getMessage();
        echo json_encode($ret);
        die();
    }
}

echo json_encode($ret);
