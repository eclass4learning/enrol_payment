<?php

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once(dirname(__FILE__).'/../lang/en/enrol_payment.php');
require_once(dirname(__FILE__).'/util.php');
require_once(dirname(__FILE__).'/../paymentlib.php');

global $DB;

$ret = array("success" => true);
$emails = json_decode(stripslashes($_POST['emails']));
$instanceid = $_POST['instanceid'];
$prepayToken = $_POST['prepaytoken'];
$ipn_id = $_POST['ipn_id'];

if ($CFG->allowaccountssameemail) {
    $ret["success"] = false;
    $ret["failreason"] = "allowaccountssameemail";
    $ret["failmessage"] = get_string("sameemailaccountsallowed", "enrol_payment");
} else if (count($emails) != count(array_unique($emails))) {
    $ret["success"] = false;
    $ret["failreason"] = "duplicateemail";
    $ret["failmessage"] = get_string("duplicateemail", "enrol_payment");
} else {

    if(!$ret["success"]) {
        echo json_encode($ret);
        die();
    }

    try {
        $ret['users'] = get_moodle_users_by_emails($emails);
        $payment = get_payment_from_token($prepayToken);

        update_payment_data(true, $ret['users'], $payment);

        $instance = $DB->get_record('enrol', array("id" => $instanceid), '*', MUST_EXIST);

        //Tack new subtotals onto return data
        $ret = array_merge($ret, calculate_cost($instance, $payment));

        $ret["successmessage"] =
            get_string("multipleregistrationconfirmuserlist", "enrol_payment")
            . implode("<li>", array_map("pretty_print_user", $ret["users"]))
            . "</ul>"
            . "<br>"
            . get_string("totalcost", "enrol_payment")
            . $ret["oc_discounted"] . " × " . $payment->units . " = <b>" . $ret["subtotal_localised"] . " " . $instance->currency . "</b>"
        ;

    } catch (Exception $e) {
        $ret["success"] = false;
        $ret["failmessage"] = $e->getMessage();
        echo json_encode($ret);
        die();
    }
}

echo json_encode($ret);
