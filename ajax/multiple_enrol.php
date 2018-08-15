<?php

require_once('../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('../lang/en/enrol_ecommerce.php');

global $DB;

function get_moodle_users_by_emails($emails, $ret) {
    global $DB;
    $notfound = array();
    $userids = array();

    foreach($emails as $email) {
        $user = $DB->get_record('user', array('email' => $email), "id, email");
        if(!$user) {
            $ret["success"] = false;
            $ret["failreason"] = "usersnotfoundwithemail";
            array_push($notfound, $email);
        } else {
            array_push($userids, $user->id);
        }

    }

    $ret["userids"] = $userids;

    if ($ret["success"]) {
        try {
            $ret["dbid"] = $DB->insert_record("enrol_ecommerce_multiple", array("userids" => implode(",",$userids)));
        } catch (Exception $e) {
            $ret["success"] = false;
            $ret["failreason"] = "dbinserterror";
            $ret["failmessage"] = $e->getMessage();
        }
    } else {
        $ret["failmessage"] = get_string("usersnotfoundwithemail", "enrol_ecommerce") . implode("\n- ", $notfound);
    }

    return $ret;
}

$ret = array("success" => true);
$emails = json_decode(stripslashes($_POST['emails']));
$instanceid = $_POST['instanceid'];

if ($CFG->allowaccountssameemail) {
    $ret["success"] = false;
    $ret["failreason"] = "allowaccountssameemail";
    $ret["failmessage"] = get_string("sameemailaccountsallowed", "enrol_ecommerce");
    echo json_encode($ret);
} else if (count($emails) != count(array_unique($emails))) {
    $ret["failreason"] = "duplicateemail";
    $ret["failmessage"] = get_string("duplicateemail", "enrol_ecommerce");
    echo json_encode($ret);
} else {
    error_log(print_r($emails, true));

    $ret = get_moodle_users_by_emails($emails, $ret);
    echo json_encode($ret);
}
