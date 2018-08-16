<?php

require_once('../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('../lang/en/enrol_ecommerce.php');

global $DB;

function update_ipn_data($users, $ipn_id) {
    global $DB;
    $userids = array();
    foreach($users as $u) {
        array_push($userids, $u["id"]);
    }

    try {
        $data = [ "id" => $ipn_id
                , "multiple" => true
                , "multiple_userids" => implode(",",$userids)
                ];
        $DB->update_record("enrol_ecommerce_ipn", $data);
    } catch (Exception $e) {
        $ret["success"] = false;
        $ret["failreason"] = "dbupdateerror";
        $ret["failmessage"] = $e->getMessage();
    }
}

function get_moodle_users_by_emails($emails, $ret) {
    global $DB;
    $notfound = array();
    $users = array();

    foreach($emails as $email) {
        $user = $DB->get_record('user', array('email' => $email), "id, email, firstname, lastname");
        if($user) {
            $userdata = [ "id" => $user->id
                        , "email" => $email
                        , "name" => ($user->firstname . " " . $user->lastname)
                        ];
            array_push($users, $userdata);
        } else {
            $ret["success"] = false;
            $ret["failreason"] = "usersnotfoundwithemail";
            array_push($notfound, $email);
        }

    }

    $ret["users"] = $users;

    if (!$ret["success"]) {
        $ret["failmessage"] = get_string("usersnotfoundwithemail", "enrol_ecommerce") . implode("<li>", $notfound) . "</ul>";
    }

    return $ret;
}

function pretty_print_user($u) {
    return $u["name"] . " &lt;" . $u["email"] . "&gt;";
}

$ret = array("success" => true);
$emails = json_decode(stripslashes($_POST['emails']));
$instanceid = $_POST['instanceid'];
$ipn_id = $_POST['ipn_id'];

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
    $ret = get_moodle_users_by_emails($emails, $ret);

    if($ret["success"]) {
        update_ipn_data($ret['users'], $ipn_id);
        $ret["successmessage"] =
            get_string("multipleregistrationconfirmuserlist", "enrol_ecommerce")
          . implode("<li>", array_map("pretty_print_user", $ret["users"]));
    }

    echo json_encode($ret);
}
